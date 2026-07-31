import {
  Container,
  CosmosClient,
  RestError,
  SqlQuerySpec,
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

export const cosmosRCConfigurationSchema = z.object({
  configurationId: RcConfigurationIdSchema,
  description: z.string().min(1),
  disableLollipopFor: z.array(FiscalCodeSchema),
  hasPrecondition: z.enum(["ALWAYS", "ONCE", "NEVER"]),
  id: z.string().min(1),
  isLollipopEnabled: z.boolean(),
  name: z.string().min(1),
  userId: z.string().min(1),
});

type CosmosRCConfiguration = z.TypeOf<typeof cosmosRCConfigurationSchema>;
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
    const cosmosResponse = await ResultAsync.fromPromise(
      this.#cosmosContainer.items.create(configuration),
      (error) => {
        if (error instanceof RestError) {
          switch (error.statusCode) {
            case 409:
              return new ConflictError(
                `an rc configuration with id ${configuration.configurationId} already exists`,
              );
            case 429:
              return new TooManyRequestsError();
            default:
              return new GenericError(
                `error creating rc configuration with id ${configuration.configurationId}: ${error.name}: ${error.message}`,
              );
          }
        }

        return new GenericError(
          `error creating rc configuration with id ${configuration.configurationId}: ${error}`,
        );
      },
    );

    if (cosmosResponse.isErr()) {
      return err(cosmosResponse.error);
    }

    return ok(configuration);
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
      (err) => {
        if (err instanceof RestError) {
          switch (err.statusCode) {
            case 429:
              return new TooManyRequestsError();
            default:
              return new GenericError(
                `error obtaining rc configuration with id ${configurationId}: ${err.name}: ${err.message}`,
              );
          }
        }

        return new GenericError(
          `error obtaining rc configuration with id ${configurationId}: ${err}`,
        );
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
}
