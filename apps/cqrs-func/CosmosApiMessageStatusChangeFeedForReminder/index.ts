import * as winston from "winston";
import { Context } from "@azure/functions";
import { AzureContextTransport } from "@pagopa/io-functions-commons/dist/src/utils/logging";
import { getConfigOrThrow } from "../utils/config";
import { avroMessageStatusFormatter } from "../utils/formatter/messageStatusAvroFormatter";
import { handleAvroMessageStatusPublishChange } from "./handler";
import { fromSas } from "../utils/event_hub";

// eslint-disable-next-line functional/no-let
let logger: Context["log"] | undefined;
const contextTransport = new AzureContextTransport(() => logger, {
  level: "debug"
});
winston.add(contextTransport);

const config = getConfigOrThrow();

const kafkaClient = fromSas(
  config.MESSAGE_STATUS_FOR_REMINDER_TOPIC_PRODUCER_CONNECTION_STRING,
  config.KAFKA_SSL_ACTIVE,
  avroMessageStatusFormatter()
);

const run = async (
  context: Context,
  rawMessageStatus: ReadonlyArray<unknown>
): Promise<void> => {
  logger = context.log;
  return handleAvroMessageStatusPublishChange(
    context,
    kafkaClient,
    rawMessageStatus
  );
};

export default run;
