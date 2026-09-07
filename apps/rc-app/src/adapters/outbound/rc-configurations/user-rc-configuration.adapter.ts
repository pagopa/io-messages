import {
  Container,
  CosmosClient,
  ErrorResponse,
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

  constructor(cosmosClient: CosmosClient, databaseName: string) {
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
        switch (getStatusCode(error)) {
          case StatusCodes.TooManyRequests:
            return new TooManyRequestsError();
          default:
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

    return err(
      new GenericError(`error parsing user RC configurations: ${parsed.error}`),
    );
  }
}
