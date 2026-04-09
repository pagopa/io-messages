import { ContainerClient, RestError } from "@azure/storage-blob";
import { MessageContent } from "@pagopa/io-functions-commons/dist/generated/definitions/MessageContent";
import { ServiceId } from "@pagopa/io-functions-commons/dist/generated/definitions/ServiceId";
import { RetrievedMessage } from "@pagopa/io-functions-commons/dist/src/models/message";
import { readableReport } from "@pagopa/ts-commons/lib/reporters";
import * as RA from "fp-ts/ReadonlyArray";
import * as E from "fp-ts/lib/Either";
import * as J from "fp-ts/lib/Json";
import * as O from "fp-ts/lib/Option";
import * as T from "fp-ts/lib/Task";
import * as TE from "fp-ts/lib/TaskEither";
import { flow, pipe } from "fp-ts/lib/function";

import { MessageContentType } from "../generated/avro/dto/MessageContentTypeEnum";
import { IConfig } from "./config";
import { toPermanentFailure, toTransientFailure } from "./errors";
import { IStorableError, toStorableError } from "./storable_error";

const BLOB_NOT_FOUND_CODE = "BlobNotFound";
const GENERIC_CODE = "GenericError";

interface BlobStorageError {
  readonly code: string;
  readonly message: string;
}

const isRestError: (u: unknown) => u is RestError = (u): u is RestError =>
  typeof u === "object" &&
  u !== null &&
  u !== undefined &&
  (u as RestError).name === RestError.name;

const downloadBlob =
  (containerClient: ContainerClient) =>
  (
    blobName: string,
  ): TE.TaskEither<BlobStorageError, O.Option<NodeJS.ReadableStream>> =>
    pipe(
      TE.tryCatch(
        () => containerClient.getBlobClient(blobName).download(),
        (e): BlobStorageError => ({
          code:
            isRestError(e) && e.statusCode === 404
              ? BLOB_NOT_FOUND_CODE
              : GENERIC_CODE,
          message: E.toError(e).message,
        }),
      ),
      TE.map(({ readableStreamBody }) => O.fromNullable(readableStreamBody)),
    );

export const streamToText = (
  readable: NodeJS.ReadableStream,
): TE.TaskEither<BlobStorageError, string> =>
  TE.tryCatch(
    () =>
      new Promise<string>((resolve, reject) => {
        const chunks: Buffer[] = [];
        readable.on("data", (chunk: Buffer | string) =>
          chunks.push(
            Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, "utf-8"),
          ),
        );
        readable.on("end", () =>
          resolve(Buffer.concat(chunks).toString("utf-8")),
        );
        readable.on("error", reject);
      }),
    (e): BlobStorageError => ({
      code: GENERIC_CODE,
      message: E.toError(e).message,
    }),
  );

const getMessageContentFromBlob = (
  containerClient: ContainerClient,
  messageId: string,
): TE.TaskEither<Error, O.Option<MessageContent>> =>
  pipe(
    downloadBlob(containerClient)(`${messageId}.json`),
    TE.chain(
      // If O.none → return TE.right(O.none)
      // If O.some(stream) → convert to text and wrap back into Some
      O.fold(
        () => TE.right(O.none),
        (stream) => pipe(streamToText(stream), TE.map(O.some)),
      ),
    ),
    TE.chain(
      TE.fromOption(
        (): BlobStorageError => ({
          code: GENERIC_CODE,
          message: "Cannot get stored message content from empty blob",
        }),
      ),
    ),
    TE.chain(
      flow(
        J.parse,
        E.mapLeft(
          (e): BlobStorageError => ({
            code: GENERIC_CODE,
            message: `Cannot parse content text into object: ${E.toError(e).message}`,
          }),
        ),
        TE.fromEither,
      ),
    ),
    TE.chain(
      flow(
        MessageContent.decode,
        TE.fromEither,
        TE.mapLeft(
          (errors): BlobStorageError => ({
            code: GENERIC_CODE,
            message: `Cannot deserialize stored message content: ${readableReport(errors)}`,
          }),
        ),
        TE.map(O.some),
      ),
    ),
    TE.orElse((error) =>
      error.code === BLOB_NOT_FOUND_CODE
        ? TE.right(O.none as O.Option<MessageContent>)
        : TE.left(error),
    ),
    TE.mapLeft((error) => new Error(error.message)),
  );

/**
 * Retrieve a message content from blob storage and enrich message
 */
export const enrichMessageContent = (
  containerClient: ContainerClient,
  message: RetrievedMessage,
): TE.TaskEither<IStorableError<RetrievedMessage>, RetrievedMessage> =>
  pipe(
    getMessageContentFromBlob(containerClient, message.id),
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
  (messageContentChunkSize: number, containerClient: ContainerClient) =>
  (
    messages: readonly RetrievedMessage[],
  ): T.Task<
    readonly E.Either<IStorableError<RetrievedMessage>, RetrievedMessage>[]
  > =>
    pipe(
      messages,
      // split execution in chunks of 'messageContentChunkSize'
      RA.chunksOf(messageContentChunkSize),
      RA.map(
        flow(
          RA.map((m) =>
            m.isPending === false
              ? enrichMessageContent(containerClient, m)
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
