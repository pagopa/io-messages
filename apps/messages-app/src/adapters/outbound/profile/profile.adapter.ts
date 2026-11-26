import { Container, CosmosClient, SqlQuerySpec } from "@azure/cosmos";
import {
  FiscalCode,
  FiscalCodeSchema,
  GenericError,
} from "@pagopa/hexagonal-core";
import { Result, ResultAsync, err, ok } from "neverthrow";
import z from "zod";

import { MalformedEntityError } from "../../../application/ports/error.js";
import {
  Profile,
  ProfileRepository,
} from "../../../application/ports/profile.js";

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

export class ProfileCosmosAdapter implements ProfileRepository {
  #profileContainer: Container;

  constructor(
    cosmosClient: CosmosClient,
    databaseName: string,
    profileContainerName: string,
  ) {
    this.#profileContainer = cosmosClient
      .database(databaseName)
      .container(profileContainerName);
  }

  async getProfile(
    fiscalCode: FiscalCode,
  ): Promise<Result<Profile, GenericError | MalformedEntityError>> {
    const profileQuery: SqlQuerySpec = {
      parameters: [{ name: "@fiscalCode", value: fiscalCode }],
      query:
        "SELECT * FROM c WHERE c.fiscalCode = @fiscalCode ORDER BY c.version DESC OFFSET 0 LIMIT 1",
    };

    const profileResult = await ResultAsync.fromPromise(
      this.#profileContainer.items
        .query(profileQuery, { partitionKey: fiscalCode })
        .fetchNext(),
      (error) =>
        new GenericError(`error retrieving user profile: ${String(error)}`),
    );
    if (profileResult.isErr()) return err(profileResult.error);

    const rawProfile = profileResult.value.resources[0];
    if (!rawProfile) return err(new GenericError("user profile not found"));

    const parsedProfile = profileSchema.safeParse(rawProfile);
    if (!parsedProfile.success) {
      return err(new MalformedEntityError("invalid user profile"));
    }

    return ok({
      lastAppVersion: parsedProfile.data.lastAppVersion,
      servicePreferencesSettings: parsedProfile.data.servicePreferencesSettings,
    });
  }
}
