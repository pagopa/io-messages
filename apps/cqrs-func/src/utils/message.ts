import { ServiceId } from "@pagopa/io-functions-commons/dist/generated/definitions/ServiceId";
import { RetrievedMessage } from "@pagopa/io-functions-commons/dist/src/models/message";
import * as RA from "fp-ts/ReadonlyArray";
import * as E from "fp-ts/lib/Either";
import * as T from "fp-ts/lib/Task";
import * as TE from "fp-ts/lib/TaskEither";
import { flow, pipe } from "fp-ts/lib/function";
import { MessageContentRepository } from "io-messages-common-legacy/domain/message-content";
import { MessageContent } from "io-messages-common-legacy/types/MessageContent";

import { MessageContentType } from "../types/avro/MessageContentTypeEnum";
import { IConfig } from "./config";
import { toPermanentFailure, toTransientFailure } from "./errors";
import { IStorableError, toStorableError } from "./storable_error";

/**
 * Retrieve a message content from blob storage and enrich message
 */
export const enrichMessageContent = (
  messageContentRepository: MessageContentRepository,
  message: RetrievedMessage,
): TE.TaskEither<IStorableError<RetrievedMessage>, RetrievedMessage> =>
  pipe(
    TE.tryCatch(
      () => messageContentRepository.getByMessageContentById(message.id),
      (e) =>
        toTransientFailure(
          E.toError(e),
          "Cannot read message content from storage",
        )(message.id),
    ),
    TE.chain((content) =>
      content === null
        ? TE.left(
            toPermanentFailure(new Error("Message Content Blob not found"))(
              message.id,
            ),
          )
        : TE.right(content as MessageContent),
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
    messageContentChunkSize: number,
    messageContentRepository: MessageContentRepository,
  ) =>
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
              ? enrichMessageContent(messageContentRepository, m)
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
