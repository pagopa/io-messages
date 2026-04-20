import { InvocationContext } from "@azure/functions";
import * as KP from "@pagopa/fp-ts-kafkajs/dist/lib/KafkaProducerCompact";
import { RetrievedMessage } from "@pagopa/io-functions-commons/dist/src/models/message";
import * as RA from "fp-ts/lib/ReadonlyArray";
import * as TE from "fp-ts/lib/TaskEither";
import { constVoid, flow, pipe } from "fp-ts/lib/function";
import { MessageContentRepository } from "io-messages-common-legacy/domain/message-content";
import * as t from "io-ts";

import { TelemetryClient, trackException } from "../../utils/appinsights";
import { errorsToError } from "../../utils/conversions";
import {
  Failure,
  PermanentFailure,
  TransientFailure,
  toPermanentFailure,
  toTransientFailure,
} from "../../utils/errors";
import { enrichMessageContent } from "../../utils/message";

const RetriableMessagePublishFailureInput = t.interface({
  body: RetrievedMessage,
  retriable: t.literal(true),
});

type RetriableMessagePublishFailureInput = t.TypeOf<
  typeof RetriableMessagePublishFailureInput
>;
export const HandleMessagePublishFailureInput = t.union([
  RetriableMessagePublishFailureInput,
  t.interface({
    body: t.unknown,
    retriable: t.literal(false),
  }),
]);
export type HandleMessagePublishFailureInput = t.TypeOf<
  typeof HandleMessagePublishFailureInput
>;

export const HandleMessageChangeFeedPublishFailureHandler = (
  context: InvocationContext,
  message: unknown,
  telemetryClient: TelemetryClient,
  messageContentRepository: MessageContentRepository,
  client: KP.KafkaProducerCompact<RetrievedMessage>,
  // eslint-disable-next-line max-params, @typescript-eslint/no-invalid-void-type
): Promise<Failure | void> =>
  pipe(
    message,
    HandleMessagePublishFailureInput.decode,
    TE.fromEither,
    TE.mapLeft(flow(errorsToError, (e) => toPermanentFailure(e)())),
    TE.chain((failureInput) =>
      pipe(
        failureInput,
        RetriableMessagePublishFailureInput.decode,
        TE.fromEither,
        TE.mapLeft(() =>
          toPermanentFailure(Error(JSON.stringify(failureInput.body)))(),
        ),
        TE.map((retriableFailure) => retriableFailure.body),
      ),
    ),
    TE.chain((retrievedMessage) =>
      pipe(
        enrichMessageContent(messageContentRepository, retrievedMessage),
        TE.mapLeft((_) =>
          toTransientFailure(Error("Cannot Enrich MessageContent"))(),
        ),
      ),
    ),
    TE.chain(
      flow(
        RA.of,
        KP.sendMessages(client),
        TE.mapLeft(
          flow(
            RA.reduce("", (acc, err) => `${acc}|${err.message}`),
            (msg) => toTransientFailure(Error(msg))(),
          ),
        ),
        TE.map(constVoid),
      ),
    ),
    TE.mapLeft((err) => {
      const isTransient = TransientFailure.is(err);
      const error = isTransient
        ? `HandleMessageChangeFeedPublishFailureHandler|TRANSIENT_ERROR=${err.reason}`
        : `HandleMessageChangeFeedPublishFailureHandler|FATAL|PERMANENT_ERROR=${
            err.reason
          }|INPUT=${JSON.stringify(message)}`;
      trackException(telemetryClient, {
        exception: new Error(error),
        properties: {
          detail: err.kind,
          fatal: PermanentFailure.is(err).toString(),
          isSuccess: "false",
          modelId: err.modelId ?? "",
          name: "message.cqrs.changefeed.retry.failure",
        },
        tagOverrides: { samplingEnabled: String(isTransient) },
      });
      context.error(error);
      if (isTransient) {
        // Trigger a retry in case of temporary failures
        throw new Error(error);
      }
      return err;
    }),
    TE.toUnion,
  )();

export const queueFailureHandler =
  (
    telemetryClient: TelemetryClient,
    messageContentRepository: MessageContentRepository,
    kafkaClient: KP.KafkaProducerCompact<RetrievedMessage>,
  ) =>
  async (
    message: unknown,
    context: InvocationContext,
    // eslint-disable-next-line @typescript-eslint/no-invalid-void-type
  ): Promise<Failure | void> =>
    HandleMessageChangeFeedPublishFailureHandler(
      context,
      message,
      telemetryClient,
      messageContentRepository,
      kafkaClient,
    );
