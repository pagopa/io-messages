import { app, output } from "@azure/functions";
import { createBlobService as createMigrationBlobService } from "@pagopa/azure-storage-legacy-migration-kit";
import { FiscalCode } from "@pagopa/io-functions-commons/dist/generated/definitions/FiscalCode";
import { HttpsUrl } from "@pagopa/io-functions-commons/dist/generated/definitions/HttpsUrl";
import { getMailerTransporter } from "@pagopa/io-functions-commons/dist/src/mailer";
import {
  ACTIVATION_COLLECTION_NAME,
  ActivationModel,
} from "@pagopa/io-functions-commons/dist/src/models/activation";
import {
  MESSAGE_COLLECTION_NAME,
  MessageModel,
} from "@pagopa/io-functions-commons/dist/src/models/message";
import {
  MESSAGE_STATUS_COLLECTION_NAME,
  MessageStatusModel,
} from "@pagopa/io-functions-commons/dist/src/models/message_status";
import {
  NOTIFICATION_COLLECTION_NAME,
  NotificationModel,
} from "@pagopa/io-functions-commons/dist/src/models/notification";
import {
  NOTIFICATION_STATUS_COLLECTION_NAME,
  NotificationStatusModel,
} from "@pagopa/io-functions-commons/dist/src/models/notification_status";
import {
  PROFILE_COLLECTION_NAME,
  ProfileModel,
} from "@pagopa/io-functions-commons/dist/src/models/profile";
import {
  SERVICE_COLLECTION_NAME,
  ServiceModel,
} from "@pagopa/io-functions-commons/dist/src/models/service";
import {
  SERVICE_PREFERENCES_COLLECTION_NAME,
  ServicesPreferencesModel,
} from "@pagopa/io-functions-commons/dist/src/models/service_preference";
import { agent } from "@pagopa/ts-commons";
import {
  AbortableFetch,
  setFetchTimeout,
  toFetch,
} from "@pagopa/ts-commons/lib/fetch";
import { Millisecond } from "@pagopa/ts-commons/lib/units";
import { Second } from "@pagopa/ts-commons/lib/units";
import { createBlobService } from "azure-storage";
import * as E from "fp-ts/lib/Either";
import { pipe } from "fp-ts/lib/function";

import { pagoPaEcommerceClient } from "./clients/pagopa-ecommerce";
import { remoteContentClient } from "./clients/remote-content";
import { CreateMessage } from "./functions/CreateMessage/handler";
import { makeUpsertBlobFromObject } from "./functions/CreateMessage/utils";
import { getCreateNotificationHandler } from "./functions/CreateNotification/handler";
import { getEmailNotificationHandler } from "./functions/EmailNotification/handler";
import { GetMessage } from "./functions/GetMessage/handler";
import { canAccessMessageReadStatus } from "./functions/GetMessage/userPreferenceChecker/messageReadStatusAuth";
import { Info } from "./functions/Info/handler";
import { getOnFailedProcessMessageHandler } from "./functions/OnFailedProcessMessage/handler";
import { getProcessMessageHandler } from "./functions/ProcessMessage/handler";
import { getNotifyClient } from "./functions/WebhookNotification/client";
import { getWebhookNotificationHandler } from "./functions/WebhookNotification/handler";
import { initTelemetryClient } from "./utils/appinsights";
import { getConfigOrThrow } from "./utils/config";
import { cosmosdbInstance } from "./utils/cosmosdb";
import { CommonMessageData } from "./utils/events/message";
import { makeRetrieveExpandedDataFromBlob } from "./utils/with-expanded-input";

const config = getConfigOrThrow();
const telemetryClient = initTelemetryClient(config);

// ---------------------------------------------------------------------------
// Output bindings
// ---------------------------------------------------------------------------

const createdMessageOutput = output.storageQueue({
  connection: "IO_COM_STORAGE_CONNECTION_STRING",
  queueName: config.MESSAGE_CREATED_QUEUE_NAME,
});

const processedMessageOutput = output.storageQueue({
  connection: "IO_COM_STORAGE_CONNECTION_STRING",
  queueName: config.MESSAGE_PROCESSED_QUEUE_NAME,
});

const emailNotificationOutput = output.storageQueue({
  connection: "IO_COM_STORAGE_CONNECTION_STRING",
  queueName: config.NOTIFICATION_CREATED_EMAIL_QUEUE_NAME,
});

const webhookNotificationOutput = output.storageQueue({
  connection: "IO_COM_STORAGE_CONNECTION_STRING",
  queueName: config.NOTIFICATION_CREATED_WEBHOOK_QUEUE_NAME,
});

// ---------------------------------------------------------------------------
// Models
// ---------------------------------------------------------------------------

const messageModel = new MessageModel(
  cosmosdbInstance.container(MESSAGE_COLLECTION_NAME),
  config.MESSAGE_CONTAINER_NAME,
);

const serviceModel = new ServiceModel(
  cosmosdbInstance.container(SERVICE_COLLECTION_NAME),
);

const messageStatusModel = new MessageStatusModel(
  cosmosdbInstance.container(MESSAGE_STATUS_COLLECTION_NAME),
);

const notificationModel = new NotificationModel(
  cosmosdbInstance.container(NOTIFICATION_COLLECTION_NAME),
);

const notificationStatusModel = new NotificationStatusModel(
  cosmosdbInstance.container(NOTIFICATION_STATUS_COLLECTION_NAME),
);

const profileModel = new ProfileModel(
  cosmosdbInstance.container(PROFILE_COLLECTION_NAME),
);

const servicePreferencesModel = new ServicesPreferencesModel(
  cosmosdbInstance.container(SERVICE_PREFERENCES_COLLECTION_NAME),
  SERVICE_PREFERENCES_COLLECTION_NAME,
);

const activationModel = new ActivationModel(
  cosmosdbInstance.container(ACTIVATION_COLLECTION_NAME),
);

// ---------------------------------------------------------------------------
// Blob services
// ---------------------------------------------------------------------------

// Blob service for IO_COM storage (queue items, temporary processing data)
const blobServiceForIO = createBlobService(
  config.IO_COM_STORAGE_CONNECTION_STRING,
);

// Blob service for message content storage (reading message body)
const blobServiceForMessageContent = createBlobService(
  config.MESSAGE_CONTENT_STORAGE_CONNECTION_STRING,
);

// Migration-kit blob service for GetMessage (supports both old and new storage)
const blobServiceGetMessage = createMigrationBlobService(
  config.IO_COM_STORAGE_CONNECTION_STRING,
  config.MESSAGE_CONTENT_STORAGE_CONNECTION_STRING,
);

// ---------------------------------------------------------------------------
// Shared utilities
// ---------------------------------------------------------------------------

const sandboxFiscalCode = pipe(
  FiscalCode.decode(config.SANDBOX_FISCAL_CODE),
  E.getOrElseW(() => {
    throw new Error(
      "Check that the environment variable SANDBOX_FISCAL_CODE is set to a valid FiscalCode",
    );
  }),
);

const defaultWebhookUrl = pipe(
  HttpsUrl.decode(config.WEBHOOK_CHANNEL_URL),
  E.getOrElseW(() => {
    throw new Error(
      "Check that the environment variable WEBHOOK_CHANNEL_URL is set to a valid URL",
    );
  }),
);

const retrieveProcessingMessageData = makeRetrieveExpandedDataFromBlob(
  CommonMessageData,
  blobServiceForIO,
  config.PROCESSING_MESSAGE_CONTAINER_NAME,
);

// ---------------------------------------------------------------------------
// HTTP Trigger: Info
// ---------------------------------------------------------------------------

app.http("Info", {
  authLevel: "anonymous",
  handler: Info(),
  methods: ["GET"],
  route: "info",
});

// ---------------------------------------------------------------------------
// HTTP Trigger: CreateMessage
// ---------------------------------------------------------------------------

app.http("CreateMessage", {
  authLevel: "function",
  extraOutputs: [createdMessageOutput],
  handler: CreateMessage(
    telemetryClient,
    remoteContentClient,
    serviceModel,
    messageModel,
    makeUpsertBlobFromObject(
      blobServiceForIO,
      config.PROCESSING_MESSAGE_CONTAINER_NAME,
    ),
    config.SANDBOX_FISCAL_CODE,
    createdMessageOutput,
  ),
  methods: ["POST"],
  route: "v1/messages/{fiscalcode?}",
});

// ---------------------------------------------------------------------------
// HTTP Trigger: GetMessage
// ---------------------------------------------------------------------------

app.http("GetMessage", {
  authLevel: "function",
  handler: GetMessage(
    serviceModel,
    messageModel,
    messageStatusModel,
    notificationModel,
    notificationStatusModel,
    blobServiceGetMessage,
    canAccessMessageReadStatus(
      profileModel,
      servicePreferencesModel,
      config.MIN_APP_VERSION_WITH_READ_AUTH,
    ),
    pagoPaEcommerceClient,
  ),
  methods: ["GET"],
  route: "v1/messages/{fiscalcode}/{id}",
});

// ---------------------------------------------------------------------------
// Queue Trigger: ProcessMessage
// ---------------------------------------------------------------------------

const processMessageHandler = getProcessMessageHandler({
  TTL_FOR_USER_NOT_FOUND: config.TTL_FOR_USER_NOT_FOUND,
  isOptInEmailEnabled: config.FF_OPT_IN_EMAIL_ENABLED,
  lActivation: activationModel,
  lBlobService: blobServiceForMessageContent,
  lMessageModel: messageModel,
  lMessageStatusModel: messageStatusModel,
  lProfileModel: profileModel,
  lServicePreferencesModel: servicePreferencesModel,
  optOutEmailSwitchDate: config.OPT_OUT_EMAIL_SWITCH_DATE,
  pendingActivationGracePeriod:
    config.PENDING_ACTIVATION_GRACE_PERIOD_SECONDS as Second,
  processedMessageOutput,
  retrieveProcessingMessageData,
  telemetryClient,
});

app.storageQueue("ProcessMessage", {
  connection: "IO_COM_STORAGE_CONNECTION_STRING",
  extraOutputs: [processedMessageOutput],
  handler: (queueItem, context) => processMessageHandler(context, queueItem),
  queueName: config.MESSAGE_CREATED_QUEUE_NAME,
});

// ---------------------------------------------------------------------------
// Queue Trigger: CreateNotification
// ---------------------------------------------------------------------------

const createNotificationHandler = getCreateNotificationHandler(
  notificationModel,
  defaultWebhookUrl,
  sandboxFiscalCode,
  config.EMAIL_NOTIFICATION_SERVICE_BLACKLIST,
  retrieveProcessingMessageData,
  emailNotificationOutput,
  webhookNotificationOutput,
);

app.storageQueue("CreateNotification", {
  connection: "IO_COM_STORAGE_CONNECTION_STRING",
  extraOutputs: [emailNotificationOutput, webhookNotificationOutput],
  handler: (queueItem, context) =>
    createNotificationHandler(context, queueItem),
  queueName: config.MESSAGE_PROCESSED_QUEUE_NAME,
});

// ---------------------------------------------------------------------------
// Queue Trigger: EmailNotification
// ---------------------------------------------------------------------------

const HTML_TO_TEXT_OPTIONS: HtmlToTextOptions = {
  ignoreImage: true, // ignore all document images
  tables: true,
};

const emailNotificationHandler = getEmailNotificationHandler(
  getMailerTransporter(config),
  notificationModel,
  retrieveProcessingMessageData,
  {
    HTML_TO_TEXT_OPTIONS,
    MAIL_FROM: config.MAIL_FROM,
  },
);

app.storageQueue("EmailNotification", {
  connection: "IO_COM_STORAGE_CONNECTION_STRING",
  handler: (queueItem, context) => emailNotificationHandler(context, queueItem),
  queueName: config.NOTIFICATION_CREATED_EMAIL_QUEUE_NAME,
});

// ---------------------------------------------------------------------------
// Queue Trigger: WebhookNotification
// ---------------------------------------------------------------------------

const DEFAULT_NOTIFY_REQUEST_TIMEOUT_MS = 5000;

const abortableFetch = AbortableFetch(agent.getHttpsFetch(process.env));
const fetchWithTimeout = setFetchTimeout(
  DEFAULT_NOTIFY_REQUEST_TIMEOUT_MS as Millisecond,
  abortableFetch,
);
const notifyApiCall = getNotifyClient(
  toFetch(fetchWithTimeout),
  config.NOTIFY_API_KEY,
);

const webhookNotificationHandler = getWebhookNotificationHandler(
  notificationModel,
  notifyApiCall,
  retrieveProcessingMessageData,
  `${config.NOTIFY_API_URL}/api/v1/notify` as HttpsUrl,
);

app.storageQueue("WebhookNotification", {
  connection: "IO_COM_STORAGE_CONNECTION_STRING",
  handler: (queueItem, context) =>
    webhookNotificationHandler(context, queueItem),
  queueName: config.NOTIFICATION_CREATED_WEBHOOK_QUEUE_NAME,
});

// ---------------------------------------------------------------------------
// Queue Trigger: OnFailedProcessMessage
// ---------------------------------------------------------------------------

const onFailedProcessMessageHandler = getOnFailedProcessMessageHandler({
  lMessageModel: messageModel,
  lMessageStatusModel: messageStatusModel,
  telemetryClient,
});

app.storageQueue("OnFailedProcessMessage", {
  connection: "IO_COM_STORAGE_CONNECTION_STRING",
  handler: (queueItem, context) =>
    onFailedProcessMessageHandler(context, queueItem),
  queueName: `${config.MESSAGE_CREATED_QUEUE_NAME}-poison`,
});
