import { CosmosClient } from "@azure/cosmos";
import { FiscalCodeSchema, GenericError } from "@pagopa/hexagonal-core";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { MalformedEntityError } from "../../../../application/ports/error.js";
import { ProfileCosmosAdapter } from "../profile.adapter.js";

const fiscalCode = FiscalCodeSchema.parse("RSSMRA80A01H501U");
const profile = {
  fiscalCode,
  id: `${fiscalCode}-0000000000000001`,
  lastAppVersion: "2.1.0.7",
  servicePreferencesSettings: { mode: "AUTO", version: 1 },
  version: 1,
};
const fetchProfile = vi.fn();
const query = vi.fn(() => ({ fetchNext: fetchProfile }));
const cosmosClient = {
  database: vi.fn(() => ({
    container: vi.fn(() => ({ items: { query } })),
  })),
} as unknown as CosmosClient;
const adapter = new ProfileCosmosAdapter(cosmosClient, "db", "profiles");

beforeEach(() => {
  vi.clearAllMocks();
  fetchProfile.mockResolvedValue({ resources: [profile] });
});

describe("ProfileCosmosAdapter", () => {
  it("queries and maps the latest persisted profile without requiring kind", async () => {
    const result = await adapter.getProfile(fiscalCode);

    expect(result._unsafeUnwrap()).toEqual({
      lastAppVersion: "2.1.0.7",
      servicePreferencesSettings: { mode: "AUTO", version: 1 },
    });
    expect(query).toHaveBeenCalledWith(
      {
        parameters: [{ name: "@fiscalCode", value: fiscalCode }],
        query:
          "SELECT * FROM c WHERE c.fiscalCode = @fiscalCode ORDER BY c.version DESC OFFSET 0 LIMIT 1",
      },
      { partitionKey: fiscalCode },
    );
  });

  it("defaults a missing app version to UNKNOWN", async () => {
    fetchProfile.mockResolvedValueOnce({
      resources: [{ ...profile, lastAppVersion: undefined }],
    });

    const result = await adapter.getProfile(fiscalCode);

    expect(result._unsafeUnwrap().lastAppVersion).toBe("UNKNOWN");
  });

  it.each([
    { ...profile, lastAppVersion: "invalid" },
    { ...profile, lastAppVersion: "02.1.0" },
    {
      lastAppVersion: "2.1.0",
      servicePreferencesSettings: { mode: "AUTO", version: 1 },
    },
    { ...profile, servicePreferencesSettings: { mode: "LEGACY", version: 1 } },
  ])("rejects a malformed profile %j", async (document) => {
    fetchProfile.mockResolvedValueOnce({ resources: [document] });

    const result = await adapter.getProfile(fiscalCode);

    expect(result._unsafeUnwrapErr()).toBeInstanceOf(MalformedEntityError);
  });

  it("returns legacy settings without applying authorization policy", async () => {
    fetchProfile.mockResolvedValueOnce({
      resources: [
        {
          ...profile,
          servicePreferencesSettings: { mode: "LEGACY", version: -1 },
        },
      ],
    });

    const result = await adapter.getProfile(fiscalCode);

    expect(result._unsafeUnwrap().servicePreferencesSettings).toEqual({
      mode: "LEGACY",
      version: -1,
    });
  });

  it("fails when the profile is missing", async () => {
    fetchProfile.mockResolvedValueOnce({ resources: [] });

    const result = await adapter.getProfile(fiscalCode);

    expect(result._unsafeUnwrapErr()).toBeInstanceOf(GenericError);
  });

  it("maps query failures to a server error", async () => {
    fetchProfile.mockRejectedValueOnce(new Error("unavailable"));

    const result = await adapter.getProfile(fiscalCode);

    expect(result._unsafeUnwrapErr()).toBeInstanceOf(GenericError);
  });
});
