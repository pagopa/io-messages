import {
  BlobNotFoundCode,
  BlobServiceWithFallBack,
  FallbackTracker,
  GenericCode,
} from "@pagopa/azure-storage-legacy-migration-kit";
import { MessageContent } from "@pagopa/io-functions-commons/dist/generated/definitions/MessageContent";
import { readableReport } from "@pagopa/ts-commons/lib/reporters";
import * as AS from "azure-storage";
import * as E from "fp-ts/lib/Either";
import * as J from "fp-ts/lib/Json";
import * as O from "fp-ts/lib/Option";
import * as TE from "fp-ts/lib/TaskEither";
import { constVoid, constant, flow, pipe } from "fp-ts/lib/function";

const isBlobNotFound = (err: AS.StorageError) =>
  err.code === "BlobNotFound" || err.statusCode === 404;

const consumeFallbackTracker = (
  containerName: string,
  blobName: string,
  tracker?: FallbackTracker,
) =>
  pipe(
    tracker,
    O.fromNullable,
    O.map((fallbackTracker) => fallbackTracker(containerName, blobName)),
    O.getOrElse(constVoid),
  );

export const getBlobAsTextWithError =
  (
    blobService: BlobServiceWithFallBack,
    containerName: string,
    options: AS.BlobService.GetBlobRequestOptions = {},
    tracker?: FallbackTracker,
  ) =>
  (blobName: string): TE.TaskEither<AS.StorageError, O.Option<string>> =>
    pipe(
      new Promise<E.Either<AS.StorageError, O.Option<string>>>((resolve) =>
        blobService.primary.getBlobToText(
          containerName,
          blobName,
          options,
          (err, result) => {
            if (!err) {
              return resolve(E.right(O.fromNullable(result)));
            }

            if (!isBlobNotFound(err)) {
              return resolve(E.left(err));
            }

            pipe(
              blobService.secondary,
              O.fromNullable,
              O.map((fallback) =>
                fallback.getBlobToText(
                  containerName,
                  blobName,
                  options,
                  (e, r) =>
                    pipe(
                      consumeFallbackTracker(containerName, blobName, tracker),
                      () => {
                        if (!e) {
                          return resolve(E.right(O.fromNullable(r)));
                        }
                        if (isBlobNotFound(e)) {
                          return resolve(E.right(O.none));
                        }
                        return resolve(E.left(e));
                      },
                    ),
                ),
              ),
              O.getOrElse(() => resolve(E.right(O.none))),
            );
          },
        ),
      ),
      constant,
    );

const MESSAGE_BLOB_STORAGE_SUFFIX = ".json";

const blobIdFromMessageId = (messageId: string): string =>
  `${messageId}${MESSAGE_BLOB_STORAGE_SUFFIX}`;

export const getContentFromBlob = (
  blobService: BlobServiceWithFallBack,
  messageId: string,
): TE.TaskEither<Error, O.Option<MessageContent>> =>
  // Retrieve blob content and deserialize
  pipe(
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
