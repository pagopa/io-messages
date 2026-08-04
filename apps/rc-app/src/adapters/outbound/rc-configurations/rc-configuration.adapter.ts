import {
  Container,
  CosmosClient,
  ErrorResponse,
  RestError,
  SqlQuerySpec,
  StatusCodes,
} from "@azure/cosmos";
import {
  ConflictError,
  FiscalCodeSchema,
  GenericError,
  NotFoundError,
  TooManyRequestsError,
} from "@pagopa/hexagonal-core";
import { Result, ResultAsync, err, ok } from "neverthrow";
import z from "zod";

import {
  RCConfiguration,
  RcConfigurationId,
  RcConfigurationIdSchema,
  RemoteContentRepository,
  rcConfigurationSchema,
} from "../../../application/ports/rc-configuration.js";

export const RC_CONFIGURATION_COLLECTION_NAME = "message-configuration";

const rcClientCertSchema = z.object({
  clientCert: z.string().min(1),
  clientKey: z.string().min(1),
  serverCa: z.string().min(1),
});

const rcAuthenticationConfigSchema = z.object({
  cert: rcClientCertSchema.optional(),
  headerKeyName: z.string().min(1),
  key: z.string().min(1),
  type: z.string().min(1),
});

const rcEnvironmentConfigSchema = z.object({
  baseUrl: z.string().min(1),
  detailsAuthentication: rcAuthenticationConfigSchema,
});

const rcTestEnvironmentConfigSchema = rcEnvironmentConfigSchema.extend({
  testUsers: z.array(FiscalCodeSchema),
});

export const cosmosRCConfigurationSchema = z.object({
  configurationId: RcConfigurationIdSchema,
  description: z.string().min(1),
  disableLollipopFor: z.array(FiscalCodeSchema),
  hasPrecondition: z.enum(["ALWAYS", "ONCE", "NEVER"]),
  id: z.string().min(1),
  isLollipopEnabled: z.boolean(),
  name: z.string().min(1),
  prodEnvironment: rcEnvironmentConfigSchema.optional(),
  testEnvironment: rcTestEnvironmentConfigSchema.optional(),
  userId: z.string().min(1),
});

type CosmosRCConfiguration = z.TypeOf<typeof cosmosRCConfigurationSchema>;

/**
 * Extracts the HTTP status code from an error thrown by the Cosmos SDK.
 *
 * The SDK reports HTTP failures by throwing an `ErrorResponse`, which carries
 * the status in `code`, while `RestError` (carrying it in `statusCode`) only
 * surfaces for transport level failures such as DNS or connection errors.
 * Returns `undefined` when no numeric status can be determined, e.g. for a
 * `RestError` whose `code` is a Node error string like `ENOTFOUND`.
 */
const getStatusCode = (error: unknown): number | undefined => {
  const statusCode =
    error instanceof ErrorResponse
      ? Number(error.code)
      : error instanceof RestError
        ? error.statusCode
        : undefined;

  return Number.isNaN(statusCode) ? undefined : statusCode;
};

const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? `${error.name}: ${error.message}` : String(error);

// Maps the adapter specific Cosmos representation to the domain type expected by
// the port.
const toRcConfiguration = (m: CosmosRCConfiguration): RCConfiguration => ({
  configurationId: m.configurationId,
  description: m.description,
  disableLollipopFor: m.disableLollipopFor,
  hasPrecondition: m.hasPrecondition,
  id: m.id,
  isLollipopEnabled: m.isLollipopEnabled,
  name: m.name,
  prodEnvironment: m.prodEnvironment,
  testEnvironment: m.testEnvironment,
  userId: m.userId,
});

export class RCConfigurationCosmosAdapter implements RemoteContentRepository {
  #cosmosContainer: Container;

  constructor(cosmosClient: CosmosClient, databaseName: string) {
    this.#cosmosContainer = cosmosClient
      .database(databaseName)
      .container(RC_CONFIGURATION_COLLECTION_NAME);
  }

  async createRemoteContentConfiguration(
    configuration: RCConfiguration,
  ): Promise<
    Result<RCConfiguration, ConflictError | GenericError | TooManyRequestsError>
  > {
    const dtoRC = cosmosRCConfigurationSchema.safeParse(configuration);
    if (!dtoRC.success) {
      return err(
        new GenericError(
          `error mapping domain entity to cosmos dto for Remote Content Configuration with id: ${configuration.id}`,
        ),
      );
    }

    const cosmosResponse = await ResultAsync.fromPromise(
      this.#cosmosContainer.items.create(dtoRC.data),
      (error) => {
        switch (getStatusCode(error)) {
          case StatusCodes.Conflict:
            return new ConflictError(
              `an rc configuration with id ${configuration.configurationId} already exists`,
            );
          case StatusCodes.TooManyRequests:
            return new TooManyRequestsError();
          default:
            return new GenericError(
              `error creating rc configuration with id ${configuration.configurationId}: ${getErrorMessage(error)}`,
            );
        }
      },
    );

    if (cosmosResponse.isErr()) {
      return err(cosmosResponse.error);
    }

    return ok(toRcConfiguration(dtoRC.data));
  }

  async getRemoteContentConfiguration(
    configurationId: RcConfigurationId,
  ): Promise<
    Result<RCConfiguration, GenericError | NotFoundError | TooManyRequestsError>
  > {
    const queryText =
      "SELECT * FROM c WHERE c.configurationId = @configurationId";
    const parameters = [{ name: "@configurationId", value: configurationId }];

    const querySpec: SqlQuerySpec = {
      parameters: parameters,
      query: queryText,
    };

    const cosmosResponse = await ResultAsync.fromPromise(
      this.#cosmosContainer.items.query(querySpec).fetchNext(),
      (error) => {
        switch (getStatusCode(error)) {
          case StatusCodes.TooManyRequests:
            return new TooManyRequestsError();
          default:
            return new GenericError(
              `error obtaining rc configuration with id ${configurationId}: ${getErrorMessage(error)}`,
            );
        }
      },
    );

    if (cosmosResponse.isErr()) {
      return err(cosmosResponse.error);
    }

    const resources = cosmosResponse.value.resources;
    if (resources.length === 0) {
      return err(
        new NotFoundError(
          `rc-configuration`,
          `RC configuration not found: ${configurationId}`,
        ),
      );
    }

    const parsed = rcConfigurationSchema.safeParse(resources[0]);
    if (parsed.success) {
      return ok(toRcConfiguration(parsed.data));
    } else {
      return err(
        new GenericError(`error parsing RC configuration: ${parsed.error}`),
      );
    }
  }

  async updateRemoteContentConfiguration(
    configuration: RCConfiguration,
  ): Promise<
    Result<RCConfiguration, GenericError | NotFoundError | TooManyRequestsError>
  > {
    const dtoRC = cosmosRCConfigurationSchema.safeParse(configuration);
    if (!dtoRC.success) {
      return err(
        new GenericError(
          `error mapping domain entity to cosmos dto for Remote Content Configuration with id: ${configuration.id}`,
        ),
      );
    }

    const cosmosResponse = await ResultAsync.fromPromise(
      this.#cosmosContainer
        .item(dtoRC.data.id, dtoRC.data.configurationId)
        .replace(dtoRC.data),
      (error) => {
        switch (getStatusCode(error)) {
          case StatusCodes.NotFound:
            return new NotFoundError(
              `rc-configuration`,
              `RC configuration not found: ${configuration.configurationId}`,
            );
          case StatusCodes.TooManyRequests:
            return new TooManyRequestsError();
          default:
            return new GenericError(
              `error updating rc configuration with id ${configuration.configurationId}: ${getErrorMessage(error)}`,
            );
        }
      },
    );

    if (cosmosResponse.isErr()) {
      return err(cosmosResponse.error);
    }

    return ok(toRcConfiguration(dtoRC.data));
  }
}
