import { InvocationContext } from "@azure/functions";
import * as KP from "@pagopa/fp-ts-kafkajs/dist/lib/KafkaProducerCompact";
import { NotRejectedMessageStatusValueEnum } from "@pagopa/io-functions-commons/dist/generated/definitions/NotRejectedMessageStatusValue";
import { RetrievedMessageStatus } from "@pagopa/io-functions-commons/dist/src/models/message_status";
import * as RA from "fp-ts/ReadonlyArray";
import * as T from "fp-ts/Task";
import * as TE from "fp-ts/TaskEither";
import { constVoid, pipe } from "fp-ts/lib/function";

export const handleAvroMessageStatusPublishChange = async (
  client: KP.KafkaProducerCompact<RetrievedMessageStatus>,
  rawMessageStatus: readonly unknown[],
): Promise<void> =>
  pipe(
    rawMessageStatus,
    RA.map(RetrievedMessageStatus.decode),
    RA.rights,
    RA.filter(
      (messageStatus) =>
        messageStatus.status === NotRejectedMessageStatusValueEnum.PROCESSED,
    ),
    KP.sendMessages(client),
    TE.mapLeft(RA.reduce("", (acc, err) => `${acc}|${err.message}`)),
    TE.getOrElseW((errMessage) => {
      throw new Error(
        `Error publishing message statuses to Reminder|${errMessage}`,
      );
    }),
    T.map(constVoid),
  )();

export const cosmosMessageStatusHandler =
  (client: KP.KafkaProducerCompact<RetrievedMessageStatus>) =>
  async (documents: unknown[], _context: InvocationContext): Promise<void> => {
    return handleAvroMessageStatusPublishChange(client, documents);
  };
