import {
  Container,
  CosmosClient,
  RestError,
  SqlQuerySpec,
} from "@azure/cosmos";
import {
  GenericError,
  NotFoundError,
  TooManyRequestsError,
  ValidationError,
} from "@pagopa/hexagonal-core";
import { Result, ResultAsync, err, ok } from "neverthrow";
import z from "zod";

import {
  MessageStatus,
  MessageStatusRepository,
} from "../../../application/ports/message-status.js";

// The message status as it is persisted on Cosmos. This is the adapter specific
// representation  and it is intentionally kept separate from the domain
// `MessageStatus` type: the adapter validates the raw document and then maps it
// to the domain type required by the port.
const cosmosMessageStatusSchema = z.object({
  isArchived: z.boolean().default(false),
  isRead: z.boolean().default(false),
  messageId: z.string().min(1),
  status: z.enum(["ACCEPTED", "THROTTLED", "FAILED", "PROCESSED", "REJECTED"]),
  updatedAt: z.string(),
  version: z.number(),
});
type CosmosMessageStatus = z.TypeOf<typeof cosmosMessageStatusSchema>;

// Maps the adapter specific Cosmos representation to the domain type expected by
// the port.
const toMessageStatus = (s: CosmosMessageStatus): MessageStatus => ({
  isArchived: s.isArchived,
  isRead: s.isRead,
  messageId: s.messageId,
  status: s.status,
  updatedAt: s.updatedAt,
  version: s.version,
});

export class MessageStatusCosmosAdapter implements MessageStatusRepository {
  #cosmosContainer: Container;

  constructor(
    cosmosClient: CosmosClient,
    databaseName: string,
    containerName: string,
  ) {
    this.#cosmosContainer = cosmosClient
      .database(databaseName)
      .container(containerName);
  }

  // needs to know this information because he want to skip the status in this case.
  async #getLatestStatusById(
    messageID: string,
  ): Promise<
    Result<
      MessageStatus,
      GenericError | NotFoundError | TooManyRequestsError | ValidationError
    >
  > {
    // Statuses are partitioned by `messageId`, so we run one single-partition
    // point query per message (`partitionKey: messageID`) instead of a single
    // cross-partition query. This is cheaper in RU and avoids fan-out: each
    // message has a small, bounded number of status versions and we only need
    // the latest one (`ORDER BY c.version DESC ... LIMIT 1`).
    const querySpec: SqlQuerySpec = {
      parameters: [{ name: "@messageId", value: messageID }],
      query:
        "SELECT * FROM c WHERE c.messageId = @messageId ORDER BY c.version DESC OFFSET 0 LIMIT 1",
    };

    const queryResult = await ResultAsync.fromPromise(
      this.#cosmosContainer.items
        .query(querySpec, { partitionKey: messageID })
        .fetchNext(),
      (err) => {
        if (err instanceof RestError) {
          switch (err.statusCode) {
            case 429:
              return new TooManyRequestsError();
            default:
              return new GenericError(
                `error obtaining latest status for message ${messageID}: ${err.name}: ${err.message}`,
              );
          }
        }

        return new GenericError(
          `error obtaining latest message status for message ${messageID}: ${err}`,
        );
      },
    );

    if (queryResult.isErr()) {
      return err(queryResult.error);
    }

    const resources = queryResult.value.resources;

    if (resources.length === 0) {
      return err(
        new NotFoundError(
          "message status",
          `cannot find any message sttus for message identified by id ${messageID}`,
        ),
      );
    }

    const [rawStatus] = queryResult.value.resources;

    const decoded = cosmosMessageStatusSchema.safeParse(rawStatus);
    if (!decoded.success) {
      return err(
        // TODO: Find a better error type. GenericError is not a good choise
        // here cause The caller needs to know if he need to perform a retry.
        new ValidationError(`Invalid message status for message ${messageID}`),
      );
    }

    return ok(toMessageStatus(decoded.data));
  }

  // getLatestStatusById returns the latest message status of the message
  // identified by `messageID`.
  //
  // NOTE: For he moment this method uses ValidationError to tell the caller
  // that the status obtained from the cosmos container is invalid. The caller
  async getLatestMessagesStatusByIds(
    messageIDs: string[],
  ): Promise<Result<MessageStatus[], GenericError | TooManyRequestsError>> {
    const results = await Promise.all(
      messageIDs.map((messageID) => this.#getLatestStatusById(messageID)),
    );

    const statuses: MessageStatus[] = [];
    for (const result of results) {
      if (result.isErr()) {
        if (result.error instanceof ValidationError) {
          // If a status is invalid we simply want to ignore it.
          // TODO: Add a log in this case.
          continue;
        }

        if (result.error instanceof NotFoundError) {
          // If a status is migging we simply want to ignore it.
          // TODO: Add a log in this case.
          continue;
        }

        return err(result.error);
      }
      statuses.push(result.value);
    }

    return ok(statuses);
  }
}
