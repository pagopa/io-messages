import { AzureFunction, Context } from "@azure/functions";
import { createBlobService } from "@pagopa/azure-storage-legacy-migration-kit";
import {
  MESSAGE_COLLECTION_NAME,
  MessageModel,
} from "@pagopa/io-functions-commons/dist/src/models/message";
import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";

import { initTelemetryClient } from "../utils/appinsights";
import { getConfigOrThrow } from "../utils/config";
import { cosmosdbInstance } from "../utils/cosmosdb";
import { Failure } from "../utils/errors";
import { fromSas } from "../utils/event_hub";
import { avroMessageFormatter } from "../utils/formatter/messagesAvroFormatter";
import { getThirdPartyDataWithCategoryFetcher } from "../utils/message";
import { HandleMessageChangeFeedPublishFailureHandler } from "./handler";

const config = getConfigOrThrow();

const messageModel = new MessageModel(
  cosmosdbInstance.container(MESSAGE_COLLECTION_NAME),
  "message-content" as NonEmptyString,
);

const messageContentBlobService = createBlobService(
  config.COM_STORAGE_CONNECTION_STRING,
  config.MESSAGE_CONTENT_STORAGE_CONNECTION,
);

const telemetryClient = initTelemetryClient(
  config.APPLICATIONINSIGHTS_CONNECTION_STRING,
);

const kafkaClient = fromSas(
  config.MESSAGES_TOPIC_CONNECTION_STRING,
  config.KAFKA_SSL_ACTIVE,
  avroMessageFormatter(getThirdPartyDataWithCategoryFetcher(config)),
);

export const index: AzureFunction = (
  context: Context,
  message: unknown,
  // eslint-disable-next-line @typescript-eslint/no-invalid-void-type
): Promise<Failure | void> =>
  HandleMessageChangeFeedPublishFailureHandler(
    context,
    message,
    telemetryClient,
    messageModel,
    messageContentBlobService,
    kafkaClient,
  );

export default index;
