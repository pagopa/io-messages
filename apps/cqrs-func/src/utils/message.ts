import { ContainerClient } from "@azure/storage-blob";
import { MessageContent } from "@pagopa/io-functions-commons/dist/generated/definitions/MessageContent";
import { ServiceId } from "@pagopa/io-functions-commons/dist/generated/definitions/ServiceId";
import { RetrievedMessage } from "@pagopa/io-functions-commons/dist/src/models/message";
import * as RA from "fp-ts/ReadonlyArray";
import * as E from "fp-ts/lib/Either";
import * as O from "fp-ts/lib/Option";
import * as T from "fp-ts/lib/Task";
import * as TE from "fp-ts/lib/TaskEither";
import { flow, pipe } from "fp-ts/lib/function";

import { MessageContentType } from "../generated/avro/dto/MessageContentTypeEnum";
import { IConfig } from "./config";
import { toPermanentFailure, toTransientFailure } from "./errors";
import { IStorableError, toStorableError } from "./storable_error";

const getMessageContentFromBlob = (
  containerClient: ContainerClient,
  messageId: string,
): TE.TaskEither<Error, O.Option<MessageContent>> =>
  TE.tryCatch(async () => {
    try {
      const buffer = await containerClient
        .getBlobClient(`${messageId}.json`)
        .downloadToBuffer();
      const json = JSON.parse(buffer.toString("utf-8")) as unknown;
      const decoded = MessageContent.decode(json);
      if (E.isLeft(decoded)) {
        throw new Error("Cannot decode message content");
      }
      return O.some(decoded.right);
    } catch (e) {
      if (
        e !== null &&
        typeof e === "object" &&
        (e as { statusCode?: number }).statusCode === 404
      ) {
        return O.none as O.Option<MessageContent>;
      }
      throw e;
    }
  }, E.toError);

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
