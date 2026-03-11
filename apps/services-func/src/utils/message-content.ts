import { MessageContent } from "@pagopa/io-functions-commons/dist/generated/definitions/MessageContent";
import { readableReport } from "@pagopa/ts-commons/lib/reporters";
import * as AS from "azure-storage";
import * as E from "fp-ts/lib/Either";
import * as J from "fp-ts/lib/Json";
import * as O from "fp-ts/lib/Option";
import * as TE from "fp-ts/lib/TaskEither";
import { constant, flow, pipe } from "fp-ts/lib/function";

const isBlobNotFound = (err: AS.StorageError) =>
  err.code === "BlobNotFound" || err.statusCode === 404;

export const getBlobAsTextWithError =
  (
    blobService: AS.BlobService,
    containerName: string,
    options: AS.BlobService.GetBlobRequestOptions = {},
  ) =>
  (blobName: string): TE.TaskEither<AS.StorageError, O.Option<string>> =>
    pipe(
      new Promise<E.Either<AS.StorageError, O.Option<string>>>((resolve) =>
        blobService.getBlobToText(
          containerName,
          blobName,
          options,
          (err, result) => {
            if (!err) {
              return resolve(E.right(O.fromNullable(result)));
            }
            if (isBlobNotFound(err)) {
              return resolve(E.right(O.none));
            }
            return resolve(E.left(err));
          },
        ),
      ),
      constant,
    );

const MESSAGE_BLOB_STORAGE_SUFFIX = ".json";

const blobIdFromMessageId = (messageId: string): string =>
  `${messageId}${MESSAGE_BLOB_STORAGE_SUFFIX}`;

export const getContentFromBlob = (
  blobService: AS.BlobService,
  messageId: string,
): TE.TaskEither<Error, O.Option<MessageContent>> =>
  // Retrieve blob content and deserialize
  pipe(
    blobIdFromMessageId(messageId),
    getBlobAsTextWithError(blobService, "message-content"),
    TE.mapLeft((storageError) => new Error(storageError.message)),
    TE.chain((maybeContentAsText) =>
      O.isNone(maybeContentAsText)
        ? TE.right(O.none as O.Option<MessageContent>)
        : pipe(
            maybeContentAsText.value,
            J.parse,
            E.mapLeft(E.toError),
            TE.fromEither,
            TE.mapLeft(
              (parseError) =>
                new Error(
                  `Cannot parse content text into object: ${parseError.message}`,
                ),
            ),
            TE.chain(
              flow(
                MessageContent.decode,
                TE.fromEither,
                TE.mapLeft(
                  (decodeErrors) =>
                    new Error(
                      `Cannot deserialize stored message content: ${readableReport(
                        decodeErrors,
                      )}`,
                    ),
                ),
                TE.map(O.some),
              ),
            ),
          ),
    ),
  );
