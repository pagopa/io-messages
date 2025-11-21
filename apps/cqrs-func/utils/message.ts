import * as E from "fp-ts/lib/Either";
import { flow, pipe } from "fp-ts/lib/function";
import * as T from "fp-ts/lib/Task";
import * as TE from "fp-ts/lib/TaskEither";
import * as RA from "fp-ts/ReadonlyArray";
import * as O from "fp-ts/lib/Option";
import * as J from "fp-ts/Json";
import { readableReport } from "@pagopa/ts-commons/lib/reporters";
import { MessageContent } from "@pagopa/io-functions-commons/dist/generated/definitions/MessageContent";
import { ServiceId } from "@pagopa/io-functions-commons/dist/generated/definitions/ServiceId";
import {
  MessageModel,
  RetrievedMessage,
} from "@pagopa/io-functions-commons/dist/src/models/message";
import { MessageContentType } from "../generated/avro/dto/MessageContentTypeEnum";
import { toPermanentFailure, toTransientFailure } from "./errors";
import { IStorableError, toStorableError } from "./storable_error";
import { IConfig } from "./config";
import {
  BlobNotFoundCode,
  BlobServiceWithFallBack,
  GenericCode,
  getBlobAsTextWithError,
} from "@pagopa/azure-storage-legacy-migration-kit";
/**
 * Retrieve a message content from blob storage and enrich message
 */
export const enrichMessageContent = (
  messageModel: MessageModel,
  blobService: BlobServiceWithFallBack,
  message: RetrievedMessage,
): TE.TaskEither<IStorableError<RetrievedMessage>, RetrievedMessage> =>
  pipe(
    getContentFromBlob(blobService, message.id),
    TE.mapLeft((e) =>
      toTransientFailure(
        e,
        "Cannot read message content from storage",
      )(message.id),
    ),
    TE.chain(
      TE.fromOption(() =>
        toPermanentFailure(Error(`Message Content Blob not found`))(message.id),
      ),
    ),
    TE.mapLeft(toStorableError(message)),
    TE.map((content) => ({
      ...message,
      content,
      kind: "IRetrievedMessageWithContent",
    })),
  );

/**
 * Enrich messages with content, retrieved from blob storage, if exists
 *
 */
export const enrichMessagesContent =
  (
    messageModel: MessageModel,
    messageContentChunkSize: number,
    blobService: BlobServiceWithFallBack,
  ) =>
  (
    messages: ReadonlyArray<RetrievedMessage>,
  ): T.Task<
    ReadonlyArray<E.Either<IStorableError<RetrievedMessage>, RetrievedMessage>>
  > =>
    pipe(
      messages,
      // split execution in chunks of 'messageContentChunkSize'
      RA.chunksOf(messageContentChunkSize),
      RA.map(
        flow(
          RA.map((m) =>
            m.isPending === false
              ? enrichMessageContent(messageModel, blobService, m)
              : TE.of(m),
          ),
          // call task in parallel
          RA.sequence(T.ApplicativePar),
        ),
      ),
      // call chunk tasks sequentially
      RA.sequence(T.ApplicativeSeq),
      T.map(RA.flatten),
    );

export interface IThirdPartyDataWithCategory {
  readonly category: Exclude<MessageContentType, MessageContentType.PAYMENT>;
}

export type ThirdPartyDataWithCategoryFetcher = (
  serviceId: ServiceId,
) => IThirdPartyDataWithCategory;

export const getThirdPartyDataWithCategoryFetcher: (
  config: IConfig,
) => ThirdPartyDataWithCategoryFetcher =
  (
    config,
    // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  ) =>
  (serviceId) =>
    pipe(
      serviceId,
      E.fromPredicate(
        (id) => id === config.PN_SERVICE_ID,
        (id) => Error(`Missing third-party service configuration for ${id}`),
      ),
      E.map(() => MessageContentType.PN as const),
      E.mapLeft(() => MessageContentType.GENERIC as const),
      E.toUnion,
      (category) => ({
        category,
      }),
    );

const MESSAGE_BLOB_STORAGE_SUFFIX = ".json";
const blobIdFromMessageId = (messageId: string): string =>
  `${messageId}${MESSAGE_BLOB_STORAGE_SUFFIX}`;

const getContentFromBlob = (
  blobService: BlobServiceWithFallBack,
  messageId: string,
): TE.TaskEither<Error, O.Option<MessageContent>> => {
  // Retrieve blob content and deserialize
  return pipe(
    blobIdFromMessageId(messageId),
    getBlobAsTextWithError(blobService, "message-content"),
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
        TE.map(O.some),
      ),
    ),
    TE.orElse((error) =>
      error.code === BlobNotFoundCode ? TE.right(O.none) : TE.left(error),
    ),
    TE.mapLeft((error) => new Error(error.message)),
  );
};
