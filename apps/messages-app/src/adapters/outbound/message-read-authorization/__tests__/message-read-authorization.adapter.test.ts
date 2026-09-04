import { CosmosClient } from "@azure/cosmos";
import { GenericError } from "@pagopa/hexagonal-core";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { MessageReadAuthorizationCosmosAdapter } from "../message-read-authorization.adapter.js";

const fiscalCode = "RSSMRA80A01H501U";
const fetchProfile = vi.fn();
const readPreference = vi.fn();
const query = vi.fn(() => ({ fetchNext: fetchProfile }));
const item = vi.fn(() => ({ read: readPreference }));
const cosmosClient = {
  database: vi.fn(() => ({
    container: vi.fn((containerName: string) =>
      containerName === "profiles" ? { items: { query } } : { item },
    ),
  })),
} as unknown as CosmosClient;

const adapter = new MessageReadAuthorizationCosmosAdapter(
  cosmosClient,
  "db",
  "profiles",
  "service-preferences",
  "2.0.0",
);

beforeEach(() => {
  vi.clearAllMocks();
  fetchProfile.mockResolvedValue({
    resources: [
      {
        fiscalCode,
        id: `${fiscalCode}-0000000000000001`,
        kind: "IRetrievedProfile",
        lastAppVersion: "2.1.0.7",
        servicePreferencesSettings: { mode: "AUTO", version: 1 },
        version: 1,
      },
    ],
  });
  readPreference.mockResolvedValue({ resource: undefined });
});

describe("MessageReadAuthorizationCosmosAdapter", () => {
  it.each(["UNKNOWN", "1.9.9"])(
    "denies access for unsupported app version %s",
    async (lastAppVersion) => {
      fetchProfile.mockResolvedValueOnce({
        resources: [
          {
            fiscalCode,
            id: `${fiscalCode}-0000000000000001`,
            kind: "IRetrievedProfile",
            lastAppVersion,
            servicePreferencesSettings: { mode: "AUTO", version: 1 },
            version: 1,
          },
        ],
      });

      const result = await adapter.canAccessReadStatus(
        "subscription-id",
        fiscalCode,
      );

      expect(result._unsafeUnwrap()).toBe(false);
      expect(readPreference).not.toHaveBeenCalled();
    },
  );

  it("rejects a malformed app version", async () => {
    fetchProfile.mockResolvedValueOnce({
      resources: [
        {
          fiscalCode,
          id: `${fiscalCode}-0000000000000001`,
          kind: "IRetrievedProfile",
          lastAppVersion: "invalid",
          servicePreferencesSettings: { mode: "AUTO", version: 1 },
          version: 1,
        },
      ],
    });

    const result = await adapter.canAccessReadStatus(
      "subscription-id",
      fiscalCode,
    );

    expect(result._unsafeUnwrapErr()).toBeInstanceOf(GenericError);
    expect(readPreference).not.toHaveBeenCalled();
  });

  it("allows access when an eligible user has no service preference", async () => {
    const result = await adapter.canAccessReadStatus(
      "subscription-id",
      fiscalCode,
    );

    expect(result._unsafeUnwrap()).toBe(true);
  });

  it.each([
    ["ALLOW", true],
    ["UNKNOWN", true],
    ["DENY", false],
  ] as const)("maps preference %s to %s", async (preference, expected) => {
    readPreference.mockResolvedValueOnce({
      resource: {
        accessReadMessageStatus: preference,
        fiscalCode,
        id: `${fiscalCode}-subscription-id-0000000000000001`,
        isEmailEnabled: true,
        isInboxEnabled: true,
        isWebhookEnabled: true,
        kind: "IRetrievedServicePreference",
        serviceId: "subscription-id",
        settingsVersion: 1,
      },
    });

    const result = await adapter.canAccessReadStatus(
      "subscription-id",
      fiscalCode,
    );

    expect(result._unsafeUnwrap()).toBe(expected);
    expect(item).toHaveBeenCalledWith(
      `${fiscalCode}-subscription-id-0000000000000001`,
      fiscalCode,
    );
  });

  it("denies access for legacy preference settings", async () => {
    fetchProfile.mockResolvedValueOnce({
      resources: [
        {
          fiscalCode,
          id: `${fiscalCode}-0000000000000001`,
          kind: "IRetrievedProfile",
          lastAppVersion: "2.1.0",
          servicePreferencesSettings: { mode: "LEGACY", version: -1 },
          version: 1,
        },
      ],
    });

    const result = await adapter.canAccessReadStatus(
      "subscription-id",
      fiscalCode,
    );

    expect(result._unsafeUnwrap()).toBe(false);
    expect(readPreference).not.toHaveBeenCalled();
  });

  it("rejects a partial profile document", async () => {
    fetchProfile.mockResolvedValueOnce({
      resources: [
        {
          lastAppVersion: "2.1.0",
          servicePreferencesSettings: { mode: "AUTO", version: 1 },
        },
      ],
    });

    const result = await adapter.canAccessReadStatus(
      "subscription-id",
      fiscalCode,
    );

    expect(result._unsafeUnwrapErr()).toBeInstanceOf(GenericError);
  });

  it("rejects a partial service preference document", async () => {
    readPreference.mockResolvedValueOnce({
      resource: { accessReadMessageStatus: "ALLOW" },
    });

    const result = await adapter.canAccessReadStatus(
      "subscription-id",
      fiscalCode,
    );

    expect(result._unsafeUnwrapErr()).toBeInstanceOf(GenericError);
  });

  it("fails when the profile is missing", async () => {
    fetchProfile.mockResolvedValueOnce({ resources: [] });

    const result = await adapter.canAccessReadStatus(
      "subscription-id",
      fiscalCode,
    );

    expect(result._unsafeUnwrapErr()).toBeInstanceOf(GenericError);
  });
});
