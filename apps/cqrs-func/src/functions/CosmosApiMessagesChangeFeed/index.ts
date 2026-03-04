/* eslint-disable @typescript-eslint/naming-convention */ // disabled in order to use the naming convention used to flatten nested object to root ('_' char used as nested object separator)
import { Context } from "@azure/functions";
import { QueueClient } from "@azure/storage-queue";
import { createBlobService } from "@pagopa/azure-storage-legacy-migration-kit";
import {
  MESSAGE_COLLECTION_NAME,
  MessageModel,
} from "@pagopa/io-functions-commons/dist/src/models/message";
import { AzureContextTransport } from "@pagopa/io-functions-commons/dist/src/utils/logging";
import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import * as winston from "winston";

import { initTelemetryClient } from "../utils/appinsights";
import { getConfigOrThrow } from "../utils/config";
import { cosmosdbInstance } from "../utils/cosmosdb";
import { Failure } from "../utils/errors";
import { fromSas } from "../utils/event_hub";
import { avroMessageFormatter } from "../utils/formatter/messagesAvroFormatter";
import { getThirdPartyDataWithCategoryFetcher } from "../utils/message";
import { IBulkOperationResult } from "../utils/publish";
import { handleMessageChange } from "./handler";

let logger: Context["log"] | undefined;
const contextTransport = new AzureContextTransport(() => logger, {
  level: "debug",
});
winston.add(contextTransport);

const config = getConfigOrThrow();

const telemetryClient = initTelemetryClient(
  config.APPLICATIONINSIGHTS_CONNECTION_STRING,
);

const kafkaClient = fromSas(
  config.MESSAGES_TOPIC_CONNECTION_STRING,
  config.KAFKA_SSL_ACTIVE,
  avroMessageFormatter(getThirdPartyDataWithCategoryFetcher(config)),
);

const errorStorage = new QueueClient(
  config.COM_STORAGE_CONNECTION_STRING,
  config.MESSAGE_PAYMENT_UPDATER_FAILURE_QUEUE_NAME,
);

const messageModel = new MessageModel(
  cosmosdbInstance.container(MESSAGE_COLLECTION_NAME),
  "message-content" as NonEmptyString,
);

const messageContentBlobService = createBlobService(
  config.COM_STORAGE_CONNECTION_STRING,
  config.MESSAGE_CONTENT_STORAGE_CONNECTION,
);

const run = async (
  context: Context,
  documents: readonly unknown[],
): Promise<Failure | IBulkOperationResult> => {
  logger = context.log;
  return handleMessageChange(
    messageModel,
    messageContentBlobService,
    config.MESSAGE_CHANGE_FEED_START_TIME,
  )(
    kafkaClient,
    errorStorage,
    telemetryClient,
    "messageForPaymentUpdater",
    documents,
  );
};

export default run;
