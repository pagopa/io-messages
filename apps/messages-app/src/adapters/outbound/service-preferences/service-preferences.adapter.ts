import {
  Container,
  CosmosClient,
  ErrorResponse,
  RestError,
} from "@azure/cosmos";
import {
  FiscalCode,
  FiscalCodeSchema,
  GenericError,
  NotFoundError,
} from "@pagopa/hexagonal-core";
import { Result, ResultAsync, err, ok } from "neverthrow";
import z from "zod";

import { MalformedEntityError } from "../../../application/ports/error.js";
import {
  ServicePreferences,
  ServicePreferencesRepository,
} from "../../../application/ports/service-preferences.js";

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

export class ServicePreferencesCosmosAdapter
  implements ServicePreferencesRepository
{
  #servicePreferenceContainer: Container;

  constructor(
    cosmosClient: CosmosClient,
    databaseName: string,
    containerName: string,
  ) {
    this.#servicePreferenceContainer = cosmosClient
      .database(databaseName)
      .container(containerName);
  }

  async getServicePreferences(
    fiscalCode: FiscalCode,
    serviceId: string,
    settingsVersion: number,
  ): Promise<
    Result<
      ServicePreferences,
      GenericError | MalformedEntityError | NotFoundError
    >
  > {
    const documentId = `${fiscalCode}-${serviceId}-${String(settingsVersion).padStart(16, "0")}`;
    const preferenceResult = await ResultAsync.fromPromise(
      this.#servicePreferenceContainer.item(documentId, fiscalCode).read(),
      (error) =>
        (error instanceof RestError && error.statusCode === 404) ||
        (error instanceof ErrorResponse && Number(error.code) === 404)
          ? new NotFoundError("Service preferences", "not found")
          : new GenericError(
              `error retrieving user service preferences: ${String(error)}`,
            ),
    );
    if (preferenceResult.isErr()) return err(preferenceResult.error);

    const rawPreference = preferenceResult.value.resource;
    if (!rawPreference) {
      return err(new NotFoundError("Service preferences", "not found"));
    }

    const parsedPreference = servicePreferenceSchema.safeParse(rawPreference);
    if (!parsedPreference.success) {
      return err(new MalformedEntityError("invalid user service preference"));
    }

    return ok({
      accessReadMessageStatus: parsedPreference.data.accessReadMessageStatus,
    });
  }
}
