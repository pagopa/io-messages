import type { Logger } from "@pagopa/hexagonal-core/domain/ports";

import {
  Container,
  CosmosClient,
  RestError,
  SqlQuerySpec,
  StatusCodes,
} from "@azure/cosmos";
import { GenericError, TooManyRequestsError } from "@pagopa/hexagonal-core";
import { Result, ResultAsync, err, ok } from "neverthrow";
import z from "zod";

import {
  UserRCConfiguration,
  UserRCConfigurationRepository,
} from "../../../application/ports/user-rc-configuration.js";

export const USER_RC_CONFIGURATIONS_COLLECTION_NAME = "user-configurations";

const cosmosUserRCConfigurationSchema = z.object({
  id: z.string().min(1),
  userId: z.string().min(1),
});

type CosmosUserRCConfiguration = z.TypeOf<
  typeof cosmosUserRCConfigurationSchema
>;

const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? `${error.name}: ${error.message}` : String(error);

const trackCosmosFailure = (
  logger: Logger | undefined,
  failureType: "cosmos_failure" | "invalid_document" | "rate_limited",
  statusCode?: number,
): void => {
  logger?.trackEvent({
    name: "UserRCConfigurationCosmosAdapter.failed",
    properties: {
      failureType,
      operation: "list",
      ...(statusCode === undefined ? {} : { statusCode }),
    },
  });
};

const toUserRCConfiguration = (
  model: CosmosUserRCConfiguration,
): UserRCConfiguration => ({
  id: model.id,
  userId: model.userId,
});

export class UserRCConfigurationCosmosAdapter
  implements UserRCConfigurationRepository
{
  #cosmosContainer: Container;

  constructor(
    cosmosClient: CosmosClient,
    databaseName: string,
    private readonly logger?: Logger,
  ) {
    this.#cosmosContainer = cosmosClient
      .database(databaseName)
      .container(USER_RC_CONFIGURATIONS_COLLECTION_NAME);
  }

  async listUserRCConfigurations(
    userId: string,
  ): Promise<
    Result<UserRCConfiguration[], GenericError | TooManyRequestsError>
  > {
    const querySpec: SqlQuerySpec = {
      parameters: [{ name: "@userId", value: userId }],
      query: "SELECT * FROM n WHERE n.userId = @userId",
    };

    const cosmosResponse = await ResultAsync.fromPromise(
      this.#cosmosContainer.items.query(querySpec).fetchAll(),
      (error) => {
        if (error instanceof RestError) {
          switch (error.statusCode) {
            case StatusCodes.TooManyRequests:
              trackCosmosFailure(this.logger, "rate_limited", error.statusCode);
              return new TooManyRequestsError();
            default:
              trackCosmosFailure(
                this.logger,
                "cosmos_failure",
                error.statusCode,
              );
              return new GenericError(
                `error listing user rc configurations by user id ${userId}: ${getErrorMessage(error)}`,
              );
          }
        } else {
          trackCosmosFailure(this.logger, "cosmos_failure");
          return new GenericError(
            `error listing user rc configurations by user id ${userId}: ${getErrorMessage(error)}`,
          );
        }
      },
    );

    if (cosmosResponse.isErr()) {
      return err(cosmosResponse.error);
    }

    const parsed = z
      .array(cosmosUserRCConfigurationSchema)
      .safeParse(cosmosResponse.value.resources);
    if (parsed.success) {
      return ok(parsed.data.map(toUserRCConfiguration));
    }

    trackCosmosFailure(this.logger, "invalid_document");
    return err(
      new GenericError(`error parsing user RC configurations: ${parsed.error}`),
    );
  }
}
