import { AzureFunction } from "@azure/functions";
import { FiscalCode } from "@pagopa/io-functions-commons/dist/generated/definitions/FiscalCode";
import { HttpsUrl } from "@pagopa/io-functions-commons/dist/generated/definitions/HttpsUrl";
import {
  NOTIFICATION_COLLECTION_NAME,
  NotificationModel,
} from "@pagopa/io-functions-commons/dist/src/models/notification";
import { createBlobService } from "azure-storage";
import * as E from "fp-ts/lib/Either";
import { pipe } from "fp-ts/lib/function";

import { getConfigOrThrow } from "../../utils/config";
import { cosmosdbInstance } from "../../utils/cosmosdb";
import { CommonMessageData } from "../../utils/events/message";
import { makeRetrieveExpandedDataFromBlob } from "../../utils/with-expanded-input";
import { getCreateNotificationHandler } from "./handler";

const config = getConfigOrThrow();

const sandboxFiscalCode = pipe(
  FiscalCode.decode(config.SANDBOX_FISCAL_CODE),
  E.getOrElseW(() => {
    throw new Error(
      `Check that the environment variable SANDBOX_FISCAL_CODE is set to a valid FiscalCode`,
    );
  }),
);

const emailNotificationServiceBlackList =
  config.EMAIL_NOTIFICATION_SERVICE_BLACKLIST;

const notificationModel = new NotificationModel(
  cosmosdbInstance.container(NOTIFICATION_COLLECTION_NAME),
);

const defaultWebhookUrl = pipe(
  HttpsUrl.decode(config.WEBHOOK_CHANNEL_URL),
  E.getOrElseW(() => {
    throw new Error(
      `Check that the environment variable WEBHOOK_CHANNEL_URL is set to a valid URL`,
    );
  }),
);

const blobService = createBlobService(config.IO_COM_STORAGE_CONNECTION_STRING);

const retrieveProcessingMessageData = makeRetrieveExpandedDataFromBlob(
  CommonMessageData,
  blobService,
  config.PROCESSING_MESSAGE_CONTAINER_NAME,
);

const functionHandler: AzureFunction = getCreateNotificationHandler(
  notificationModel,
  defaultWebhookUrl,
  sandboxFiscalCode,
  emailNotificationServiceBlackList,
  retrieveProcessingMessageData,
);

export default functionHandler;
