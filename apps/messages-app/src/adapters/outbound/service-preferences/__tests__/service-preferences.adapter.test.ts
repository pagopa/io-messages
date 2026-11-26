import { CosmosClient, ErrorResponse, RestError } from "@azure/cosmos";
import {
  FiscalCodeSchema,
  GenericError,
  NotFoundError,
} from "@pagopa/hexagonal-core";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { MalformedEntityError } from "../../../../application/ports/error.js";
import { ServicePreferencesCosmosAdapter } from "../service-preferences.adapter.js";

const fiscalCode = FiscalCodeSchema.parse("RSSMRA80A01H501U");
const preference = {
  accessReadMessageStatus: "ALLOW",
  fiscalCode,
  id: `${fiscalCode}-subscription-id-0000000000000001`,
  isEmailEnabled: true,
  isInboxEnabled: true,
  isWebhookEnabled: true,
  serviceId: "subscription-id",
  settingsVersion: 1,
};
const readPreference = vi.fn();
const item = vi.fn(() => ({ read: readPreference }));
const cosmosClient = {
  database: vi.fn(() => ({
    container: vi.fn(() => ({ item })),
  })),
} as unknown as CosmosClient;
const adapter = new ServicePreferencesCosmosAdapter(
  cosmosClient,
  "db",
  "service-preferences",
);

beforeEach(() => {
  vi.clearAllMocks();
  readPreference.mockResolvedValue({ resource: preference });
});

describe("ServicePreferencesCosmosAdapter", () => {
  it.each(["ALLOW", "UNKNOWN", "DENY"])(
    "maps persisted preference %s without requiring kind",
    async (accessReadMessageStatus) => {
      readPreference.mockResolvedValueOnce({
        resource: { ...preference, accessReadMessageStatus },
      });

      const result = await adapter.getServicePreferences(
        fiscalCode,
        "subscription-id",
        1,
      );

      expect(result._unsafeUnwrap()).toEqual({ accessReadMessageStatus });
      expect(item).toHaveBeenCalledWith(
        `${fiscalCode}-subscription-id-0000000000000001`,
        fiscalCode,
      );
    },
  );

  it("defaults a missing access preference to UNKNOWN", async () => {
    readPreference.mockResolvedValueOnce({
      resource: { ...preference, accessReadMessageStatus: undefined },
    });

    const result = await adapter.getServicePreferences(
      fiscalCode,
      "subscription-id",
      1,
    );

    expect(result._unsafeUnwrap()).toEqual({
      accessReadMessageStatus: "UNKNOWN",
    });
  });

  it("reports a missing resource without deciding authorization", async () => {
    readPreference.mockResolvedValueOnce({ resource: undefined });

    const result = await adapter.getServicePreferences(
      fiscalCode,
      "subscription-id",
      1,
    );

    expect(result._unsafeUnwrapErr()).toBeInstanceOf(NotFoundError);
  });

  it.each([
    new RestError("not found", { statusCode: 404 }),
    Object.assign(new ErrorResponse("not found"), { code: 404 }),
  ])("maps Cosmos 404 errors to NotFoundError", async (error) => {
    readPreference.mockRejectedValueOnce(error);

    const result = await adapter.getServicePreferences(
      fiscalCode,
      "subscription-id",
      1,
    );

    expect(result._unsafeUnwrapErr()).toBeInstanceOf(NotFoundError);
  });

  it("maps other storage failures to a server error", async () => {
    readPreference.mockRejectedValueOnce(
      Object.assign(new ErrorResponse("unavailable"), { code: 503 }),
    );

    const result = await adapter.getServicePreferences(
      fiscalCode,
      "subscription-id",
      1,
    );

    expect(result._unsafeUnwrapErr()).toBeInstanceOf(GenericError);
  });

  it.each([
    { accessReadMessageStatus: "ALLOW" },
    { ...preference, isInboxEnabled: false },
  ])("rejects a malformed preference %j", async (document) => {
    readPreference.mockResolvedValueOnce({ resource: document });

    const result = await adapter.getServicePreferences(
      fiscalCode,
      "subscription-id",
      1,
    );

    expect(result._unsafeUnwrapErr()).toBeInstanceOf(MalformedEntityError);
  });
});
