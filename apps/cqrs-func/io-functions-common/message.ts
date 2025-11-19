import * as E from "fp-ts/lib/Either";
import * as J from "fp-ts/Json";
import { fromNullable, none, Option, some } from "fp-ts/lib/Option";
import * as O from "fp-ts/lib/Option";
import * as TE from "fp-ts/lib/TaskEither";
import * as t from "io-ts";
import {
  Container,
  FeedOptions,
  FeedResponse,
  SqlQuerySpec,
} from "@azure/cosmos";
import { NonNegativeInteger } from "@pagopa/ts-commons/lib/numbers";
import { flow, pipe } from "fp-ts/lib/function";
import { readableReport } from "@pagopa/ts-commons/lib/reporters";
import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import { CosmosdbModelTTL } from "@pagopa/io-functions-commons/dist/src/utils/cosmosdb_model_ttl";
import {
  Message,
  NewMessage,
  RetrievedMessage,
  RetrievedMessageWithoutContent,
} from "@pagopa/io-functions-commons/dist/src/models/message";
import { FiscalCode } from "@pagopa/io-functions-commons/dist/generated/definitions/FiscalCode";
import {
  CosmosDecodingError,
  CosmosErrors,
  toCosmosErrorResponse,
} from "@pagopa/io-functions-commons/dist/src/utils/cosmosdb_model";
import { MessageContent } from "@pagopa/io-functions-commons/dist/generated/definitions/MessageContent";
import {
  BlobNotFoundCode,
  BlobServiceWithFallBack,
  GenericCode,
  getBlobAsTextWithError,
} from "@pagopa/azure-storage-legacy-migration-kit";

export const MESSAGE_COLLECTION_NAME = "messages";
export const MESSAGE_MODEL_PK_FIELD = "fiscalCode" as const;

const MESSAGE_BLOB_STORAGE_SUFFIX = ".json";

const blobIdFromMessageId = (messageId: string): string =>
  `${messageId}${MESSAGE_BLOB_STORAGE_SUFFIX}`;

// /**
//  * This is the default page size for cosmos queries
//  */
export const defaultPageSize = 100 as NonNegativeInteger;

/**
 * A model for handling Messages
 */
export class MessageModel extends CosmosdbModelTTL<
  Message,
  NewMessage,
  RetrievedMessage,
  typeof MESSAGE_MODEL_PK_FIELD
> {
  /**
   * Creates a new Message model
   *
   * @param container the Cosmos container client
   */
  constructor(
    container: Container,
    protected readonly containerName: NonEmptyString,
  ) {
    super(container, NewMessage, RetrievedMessage);
  }

  /**
   * Returns the message for the provided fiscal code and message ID
   *
   * @param fiscalCode The fiscal code of the recipient
   * @param messageId The ID of the message
   */
  public findMessageForRecipient(
    fiscalCode: FiscalCode,
    messageId: NonEmptyString,
  ): TE.TaskEither<CosmosErrors, Option<RetrievedMessage>> {
    return pipe(
      this.find([messageId, fiscalCode]),
      TE.map((maybeMessage) =>
        pipe(
          maybeMessage,
          O.filter((m) => m.fiscalCode === fiscalCode),
        ),
      ),
    );
  }

  /**
   * Returns the messages for the provided fiscal code, with id based pagination capabilities
   *
   * @param fiscalCode The fiscal code of the recipient
   * @param pageSize The requested pageSize
   * @param maximumMessageId The message ID that can be used to filter next messages (older)
   * @param minimumMessageId The message ID that can be used to filter previous messages (newest)
   */
  public findMessages(
    fiscalCode: FiscalCode,
    pageSize = defaultPageSize,
    maximumMessageId?: NonEmptyString,
    minimumMessageId?: NonEmptyString,
  ): TE.TaskEither<
    CosmosErrors,
    AsyncIterator<
      ReadonlyArray<t.Validation<RetrievedMessage>>,
      ReadonlyArray<t.Validation<RetrievedMessage>>
    >
  > {
    const commonQuerySpec = {
      parameters: [
        {
          name: "@fiscalCode",
          value: fiscalCode,
        },
      ],
      query: `SELECT * FROM m WHERE m.${MESSAGE_MODEL_PK_FIELD} = @fiscalCode`,
    };
    const emptyMessageParameter = {
      condition: "",
      param: [],
    };
    return pipe(
      TE.of({
        nextMessagesParams: pipe(
          fromNullable(maximumMessageId),
          O.foldW(
            () => emptyMessageParameter,
            (maximumId) => ({
              condition: ` AND m.id < @maxId`,
              param: [{ name: "@maxId", value: maximumId }],
            }),
          ),
        ),
        prevMessagesParams: pipe(
          fromNullable(minimumMessageId),
          O.foldW(
            () => emptyMessageParameter,
            (minimumId) => ({
              condition: ` AND m.id > @minId`,
              param: [{ name: "@minId", value: minimumId }],
            }),
          ),
        ),
      }),
      TE.mapLeft(toCosmosErrorResponse),
      TE.map(({ nextMessagesParams, prevMessagesParams }) => ({
        parameters: [
          ...commonQuerySpec.parameters,
          ...nextMessagesParams.param,
          ...prevMessagesParams.param,
        ],
        query: `${commonQuerySpec.query}${nextMessagesParams.condition}${prevMessagesParams.condition} ORDER BY m.${MESSAGE_MODEL_PK_FIELD}, m.id DESC`,
      })),
      TE.chain((querySpec) =>
        TE.fromEither(
          E.tryCatch(
            () =>
              this.getQueryIterator(querySpec, {
                maxItemCount: pageSize,
              })[Symbol.asyncIterator](),
            toCosmosErrorResponse,
          ),
        ),
      ),
    );
  }

  /**
   * @deprecated use getQueryIterator + asyncIterableToArray
   */
  public findAllByQuery(
    query: string | SqlQuerySpec,
    options?: FeedOptions,
  ): TE.TaskEither<
    CosmosErrors,
    Option<ReadonlyArray<RetrievedMessageWithoutContent>>
  > {
    return pipe(
      TE.tryCatch<
        CosmosErrors,
        // eslint-disable-next-line @typescript-eslint/array-type
        FeedResponse<readonly RetrievedMessageWithoutContent[]>
      >(
        () =>
          this.container.items
            // eslint-disable-next-line @typescript-eslint/array-type
            .query<readonly RetrievedMessageWithoutContent[]>(query, options)
            .fetchAll(),
        toCosmosErrorResponse,
      ),
      TE.map((_) => fromNullable(_.resources)),
      TE.chain((_) =>
        O.isSome(_)
          ? pipe(
              TE.fromEither(
                E.sequenceArray(
                  _.value.map(RetrievedMessageWithoutContent.decode),
                ),
              ),
              TE.map(some),
              TE.mapLeft(CosmosDecodingError),
            )
          : TE.fromEither(E.right(none)),
      ),
    );
  }

  /**
   * Retrieve the message content from a blob
   *
   * @param blobService The azure.BlobService used to store the media
   * @param messageId The id of the message used to set the blob name
   */
  public getContentFromBlob(
    blobService: BlobServiceWithFallBack,
    messageId: string,
  ): TE.TaskEither<Error, Option<MessageContent>> {
    // Retrieve blob content and deserialize
    return pipe(
      blobIdFromMessageId(messageId),
      getBlobAsTextWithError(blobService, this.containerName),
      TE.mapLeft((storageError) => ({
        code: storageError.code ?? GenericCode,
        message: storageError.message,
      })),
      TE.chain((maybeContentAsText) =>
        TE.fromEither(
          E.fromOption(
            // Blob exists but the content is empty
            () => ({
              code: GenericCode,
              message: "Cannot get stored message content from empty blob",
            }),
          )(maybeContentAsText),
        ),
      ),
      // Try to decode the MessageContent
      TE.chain(
        flow(
          J.parse,
          E.mapLeft(E.toError),
          TE.fromEither,
          TE.mapLeft((parseError) => ({
            code: GenericCode,
            message: `Cannot parse content text into object: ${parseError.message}`,
          })),
        ),
      ),
      TE.chain(
        flow(
          MessageContent.decode,
          TE.fromEither,
          TE.mapLeft((decodeErrors) => ({
            code: GenericCode,
            message: `Cannot deserialize stored message content: ${readableReport(
              decodeErrors,
            )}`,
          })),
          TE.map(some),
        ),
      ),
      TE.orElse((error) =>
        error.code === BlobNotFoundCode ? TE.right(none) : TE.left(error),
      ),
      TE.mapLeft((error) => new Error(error.message)),
    );
  }
}
