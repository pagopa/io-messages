import type { Logger } from "@pagopa/hexagonal-core/domain/ports";

import {
  Container,
  CosmosClient,
  RestError,
  SqlQuerySpec,
} from "@azure/cosmos";
import {
  FiscalCode,
  GenericError,
  TooManyRequestsError,
} from "@pagopa/hexagonal-core";
import { Result, ResultAsync, err, ok } from "neverthrow";
import z from "zod";

import { CryptoRepository } from "../../../application/ports/crypto.js";
import {
  MessageMetadata,
  MessageMetadataRepository,
} from "../../../application/ports/message-metadata.js";

// The message metadata as it is persisted on Cosmos. This is the adapter
// specific representation  and it is intentionally kept separate from the
// domain `MessageMetadata` type: the adapter validates the raw document and
// then maps it to the domain type required by the port.
const cosmosMessageMetadataSchema = z.object({
  createdAt: z.string(),
  featureLevelType: z.enum(["ADVANCED", "STANDARD"]).default("STANDARD"),
  fiscalCode: z.string(),
  id: z.ulid(),
  indexedId: z.ulid(),
  isPending: z.boolean().default(false),
  senderServiceId: z.string().min(1),
  senderUserId: z.string().min(1),
  timeToLiveSeconds: z.number(),
});
type CosmosMessageMetadata = z.TypeOf<typeof cosmosMessageMetadataSchema>;

// Maps the adapter specific Cosmos representation to the domain type expected by
// the port.
const toMessageMetadata = (m: CosmosMessageMetadata): MessageMetadata => ({
  createdAt: m.createdAt,
  featureLevelType: m.featureLevelType,
  fiscalCode: m.fiscalCode,
  id: m.id,
  indexedId: m.indexedId,
  isPending: m.isPending,
  senderServiceId: m.senderServiceId,
  senderUserId: m.senderUserId,
  timeToLiveSeconds: m.timeToLiveSeconds,
});

export class MessageMetadataCosmosAdapter implements MessageMetadataRepository {
  #cosmosContainer: Container;

  constructor(
    cosmosClient: CosmosClient,
    databaseName: string,
    containerName: string,
    private logger: Logger,
    private crypto: CryptoRepository,
  ) {
    this.#cosmosContainer = cosmosClient
      .database(databaseName)
      .container(containerName);
  }

  async getMessagesMetadataByUser(
    fiscalCode: FiscalCode,
    pageSize: number,
    maximumID?: string,
    minimumID?: string,
  ): Promise<Result<MessageMetadata[], GenericError | TooManyRequestsError>> {
    let queryText =
      "SELECT * FROM c WHERE c.fiscalCode = @fiscalCode and c.isPending = false";
    const parameters = [{ name: "@fiscalCode", value: fiscalCode }];

    if (maximumID) {
      queryText += " AND c.id < @maximumId";
      parameters.push({ name: "@maximumId", value: maximumID });
    }

    if (minimumID) {
      queryText += " AND c.id > @minimumId";
      parameters.push({ name: "@minimumId", value: minimumID });
    }

    queryText += " ORDER BY c.id DESC";

    const querySpec: SqlQuerySpec = {
      parameters: parameters,
      query: queryText,
    };

    const cosmosResponse = await ResultAsync.fromPromise(
      this.#cosmosContainer.items
        .query(querySpec, {
          maxItemCount: pageSize,
        })
        .fetchNext(),
      (err) => {
        if (err instanceof RestError) {
          switch (err.statusCode) {
            case 429:
              return new TooManyRequestsError();
            default:
              return new GenericError(
                `error obtaining messages metadata: ${err.name}: ${err.message}`,
              );
          }
        }

        return new GenericError(`error obtaining messages metadata: ${err}`);
      },
    );

    if (cosmosResponse.isErr()) {
      return err(cosmosResponse.error);
    }

    const resources = cosmosResponse.value;

    // Once we retrieved the metadatas we perform runtime validation against the
    // adapter specific schema, we strip away invalid records and we map the
    // valid ones to the domain type required by the port.
    const decodedMetadatas: MessageMetadata[] = [];
    for (const resource of resources.resources) {
      const parsed = cosmosMessageMetadataSchema.safeParse(resource);
      if (parsed.success) {
        decodedMetadatas.push(toMessageMetadata(parsed.data));
      } else {
        this.logger.trackEvent({
          name: "MessageMetadataCosmosAdapter.getMessagesMetadataByUser.failed.parse",
          properties: {
            fiscalCode: this.crypto.toSha256(fiscalCode),
            messageId: resource.id,
          },
        });
      }
    }

    return ok(decodedMetadatas);
  }
}
