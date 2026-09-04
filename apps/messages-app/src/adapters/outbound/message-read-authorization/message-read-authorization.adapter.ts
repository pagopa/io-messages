import { CosmosClient, RestError, SqlQuerySpec } from "@azure/cosmos";
import {
  FiscalCode,
  FiscalCodeSchema,
  GenericError,
} from "@pagopa/hexagonal-core";
import { Result, ResultAsync, err, ok } from "neverthrow";
import { clean, gte } from "semver";
import z from "zod";

import { MessageReadAuthorizationRepository } from "../../../application/ports/message-read-authorization.js";

const appVersionSchema = z.union([
  z.literal("UNKNOWN"),
  z.string().regex(/^((0|[1-9]\d*)\.){2}(0|[1-9]\d*)(\.(0|[1-9]\d*)){0,1}$/),
]);

const servicePreferencesSettingsSchema = z.discriminatedUnion("mode", [
  z.object({
    mode: z.enum(["AUTO", "MANUAL"]),
    version: z.number().int().min(0),
  }),
  z.object({ mode: z.literal("LEGACY"), version: z.literal(-1) }),
]);

const profileSchema = z.object({
  fiscalCode: FiscalCodeSchema,
  id: z.string().min(1),
  kind: z.literal("IRetrievedProfile"),
  lastAppVersion: appVersionSchema.optional().default("UNKNOWN"),
  servicePreferencesSettings: servicePreferencesSettingsSchema,
  version: z.number().int().min(0),
});

const baseServicePreferenceSchema = z.object({
  fiscalCode: FiscalCodeSchema,
  id: z.string().min(1),
  isEmailEnabled: z.boolean(),
  isWebhookEnabled: z.boolean(),
  kind: z.literal("IRetrievedServicePreference"),
  serviceId: z.string().min(1),
  settingsVersion: z.number().int().min(0),
});

const servicePreferenceSchema = z.discriminatedUnion("isInboxEnabled", [
  baseServicePreferenceSchema.extend({
    accessReadMessageStatus: z
      .enum(["ALLOW", "DENY", "UNKNOWN"])
      .default("UNKNOWN"),
    isInboxEnabled: z.literal(true),
  }),
  baseServicePreferenceSchema.extend({
    accessReadMessageStatus: z.enum(["DENY", "UNKNOWN"]).default("UNKNOWN"),
    isInboxEnabled: z.literal(false),
  }),
]);

const makeServicePreferenceDocumentId = (
  fiscalCode: FiscalCode,
  serviceId: string,
  settingsVersion: number,
): string =>
  `${fiscalCode}-${serviceId}-${String(settingsVersion).padStart(16, "0")}`;

export class MessageReadAuthorizationCosmosAdapter
  implements MessageReadAuthorizationRepository
{
  constructor(
    private cosmosClient: CosmosClient,
    private databaseName: string,
    private profileContainerName: string,
    private servicePreferenceContainerName: string,
    private minAppVersion: string,
  ) {}

  async canAccessReadStatus(
    subscriptionId: string,
    fiscalCode: FiscalCode,
  ): Promise<Result<boolean, GenericError>> {
    const profileQuery: SqlQuerySpec = {
      parameters: [{ name: "@fiscalCode", value: fiscalCode }],
      query:
        "SELECT * FROM c WHERE c.fiscalCode = @fiscalCode ORDER BY c.version DESC OFFSET 0 LIMIT 1",
    };
    const profileResult = await ResultAsync.fromPromise(
      this.cosmosClient
        .database(this.databaseName)
        .container(this.profileContainerName)
        .items.query(profileQuery, { partitionKey: fiscalCode })
        .fetchNext(),
      (error) =>
        new GenericError(`error retrieving user profile: ${String(error)}`),
    );
    if (profileResult.isErr()) return err(profileResult.error);

    const rawProfile = profileResult.value.resources[0];
    if (!rawProfile) return err(new GenericError("user profile not found"));

    const parsedProfile = profileSchema.safeParse(rawProfile);
    if (!parsedProfile.success) {
      return err(new GenericError("malformed user profile"));
    }

    const currentVersion = clean(
      parsedProfile.data.lastAppVersion?.split(".").slice(0, 3).join(".") ?? "",
    );
    if (!currentVersion || !gte(currentVersion, this.minAppVersion)) {
      return ok(false);
    }

    const settingsVersion =
      parsedProfile.data.servicePreferencesSettings.version;
    if (settingsVersion === -1) {
      return ok(false);
    }

    const preferenceDocumentId = makeServicePreferenceDocumentId(
      fiscalCode,
      subscriptionId,
      settingsVersion,
    );
    const preferenceResult = await ResultAsync.fromPromise(
      this.cosmosClient
        .database(this.databaseName)
        .container(this.servicePreferenceContainerName)
        .item(preferenceDocumentId, fiscalCode)
        .read(),
      (error) => error,
    );
    if (preferenceResult.isErr()) {
      return preferenceResult.error instanceof RestError &&
        preferenceResult.error.statusCode === 404
        ? ok(true)
        : err(
            new GenericError(
              `error retrieving user service preferences: ${String(preferenceResult.error)}`,
            ),
          );
    }

    const rawPreference = preferenceResult.value.resource;
    if (!rawPreference) return ok(true);

    const parsedPreference = servicePreferenceSchema.safeParse(rawPreference);
    if (!parsedPreference.success) {
      return err(new GenericError("malformed user service preference"));
    }

    return ok(parsedPreference.data.accessReadMessageStatus !== "DENY");
  }
}
