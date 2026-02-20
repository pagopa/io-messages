import { app, output } from "@azure/functions";
import { QueueClient } from "@azure/storage-queue";
import { createBlobService } from "@pagopa/azure-storage-legacy-migration-kit";
import {
  MESSAGE_COLLECTION_NAME,
  MessageModel,
} from "@pagopa/io-functions-commons/dist/src/models/message";
import {
  PROFILE_COLLECTION_NAME,
  ProfileModel,
} from "@pagopa/io-functions-commons/dist/src/models/profile";
import {
  SERVICE_COLLECTION_NAME,
  ServiceModel,
} from "@pagopa/io-functions-commons/dist/src/models/service";
import {
  AbortableFetch,
  setFetchTimeout,
  toFetch,
} from "@pagopa/ts-commons/lib/fetch";
import { Millisecond } from "@pagopa/ts-commons/lib/units";
import * as df from "durable-functions";
import { RetryOptions } from "durable-functions";
import { pipe } from "fp-ts/lib/function";
import nodeFetch from "node-fetch";

import {
  ActivityName as CreateOrUpdateActivityName,
  getActivityHandler as getCreateOrUpdateActivityHandler,
  getCallableActivity as getCreateOrUpdateCallableActivity,
} from "./functions/HandleNHCreateOrUpdateInstallationCallActivity/handler";
import { getHandler as getCreateOrUpdateOrchestratorHandler } from "./functions/HandleNHCreateOrUpdateInstallationCallOrchestrator/handler";
import {
  ActivityName as DeleteActivityName,
  getActivityHandler as getDeleteActivityHandler,
  getCallableActivity as getDeleteCallableActivity,
} from "./functions/HandleNHDeleteInstallationCallActivity/handler";
import { getHandler as getDeleteOrchestratorHandler } from "./functions/HandleNHDeleteInstallationCallOrchestrator/handler";
import { getHandler as getNotificationCallHandler } from "./functions/HandleNHNotificationCall/handler";
import { handle as handleNotifyMessage } from "./functions/HandleNHNotifyMessageCallActivityQueue/handler";
import { Info } from "./functions/Info/handler";
import { Notify } from "./functions/Notify/handler";
import { sendNotification } from "./functions/Notify/notification";
import {
  getMessageWithContent,
  getService,
  getUserProfileReader,
  getUserSessionStatusReader,
} from "./functions/Notify/readers";
import { createClient } from "./generated/session-manager/client";
import { initTelemetryClient } from "./utils/appinsights";
import { getConfigOrThrow } from "./utils/config";
import { cosmosdbClient, cosmosdbInstance } from "./utils/cosmosdb";
import { NotificationHubPartitionFactory } from "./utils/notificationhubServicePartition";

// ---------------------------------------------------------------------------
// Shared configuration and Functions dependencies
// ---------------------------------------------------------------------------

const DEFAULT_REQUEST_TIMEOUT_MS = 10000 as Millisecond;

const config = getConfigOrThrow();
const telemetryClient = initTelemetryClient(config);

// Generic HTTP/HTTPS fetch with optional keepalive agent
// @see https://github.com/pagopa/io-ts-commons/blob/master/src/agent.ts#L10
const httpOrHttpsApiFetch = pipe(
  AbortableFetch(nodeFetch as unknown as typeof fetch),
  (abortableFetch) =>
    setFetchTimeout(DEFAULT_REQUEST_TIMEOUT_MS, abortableFetch),
  (fetchWithTimeout) => toFetch(fetchWithTimeout),
);

const nhPartitionFactory = new NotificationHubPartitionFactory(
  config.AZURE_NOTIFICATION_HUB_PARTITIONS,
);

const retryOptions = new RetryOptions(5000, config.RETRY_ATTEMPT_NUMBER);
retryOptions.backoffCoefficient = 1.5;

// Models
const messageModel = new MessageModel(
  cosmosdbInstance.container(MESSAGE_COLLECTION_NAME),
  config.MESSAGE_CONTAINER_NAME,
);

const blobService = createBlobService(
  config.NOTIFICATIONS_STORAGE_CONNECTION_STRING,
  config.MESSAGE_CONTENT_STORAGE_CONNECTION_STRING,
);

const serviceModel = new ServiceModel(
  cosmosdbInstance.container(SERVICE_COLLECTION_NAME),
);

const profileModel = new ProfileModel(
  cosmosdbInstance.container(PROFILE_COLLECTION_NAME),
);

const sessionManagerClient = createClient<"ApiKeyAuth">({
  baseUrl: config.SESSION_MANAGER_BASE_URL,
  fetchApi: httpOrHttpsApiFetch,
  withDefaults: (op) => (params) =>
    op({
      ...params,
      ApiKeyAuth: config.SESSION_MANAGER_API_KEY,
    }),
});

const notifyQueueClient = new QueueClient(
  config.NOTIFICATIONS_STORAGE_CONNECTION_STRING,
  config.NOTIFICATIONS_QUEUE_NAME,
);

// ---------------------------------------------------------------------------
// Durable Functions — Activities
// ---------------------------------------------------------------------------
df.app.activity(CreateOrUpdateActivityName, {
  handler: getCreateOrUpdateActivityHandler(
    nhPartitionFactory,
    telemetryClient,
  ),
});

df.app.activity(DeleteActivityName, {
  handler: getDeleteActivityHandler(nhPartitionFactory, telemetryClient),
});

// ---------------------------------------------------------------------------
// Durable Functions — Orchestrators
// ---------------------------------------------------------------------------
df.app.orchestration(
  "HandleNHCreateOrUpdateInstallationCallOrchestrator",
  getCreateOrUpdateOrchestratorHandler({
    createOrUpdateActivity: getCreateOrUpdateCallableActivity(retryOptions),
  }),
);

df.app.orchestration(
  "HandleNHDeleteInstallationCallOrchestrator",
  getDeleteOrchestratorHandler({
    deleteInstallationActivity: getDeleteCallableActivity(retryOptions),
  }),
);

// ---------------------------------------------------------------------------
// Queue Triggers
// ---------------------------------------------------------------------------

// Output binding for the notify-message queue (used by HandleNHNotificationCall)
const notifyQueueOutput = output.storageQueue({
  connection: "NOTIFICATIONS_STORAGE_CONNECTION_STRING",
  queueName: "%NOTIFY_MESSAGE_QUEUE_NAME%",
});

app.storageQueue("HandleNHNotificationCall", {
  connection: "NOTIFICATIONS_STORAGE_CONNECTION_STRING",
  extraInputs: [df.input.durableClient()],
  extraOutputs: [notifyQueueOutput],
  handler: getNotificationCallHandler(notifyQueueOutput),
  queueName: "%NOTIFICATIONS_QUEUE_NAME%",
});

app.storageQueue("HandleNHNotifyMessageCallActivityQueue", {
  connection: "NOTIFICATIONS_STORAGE_CONNECTION_STRING",
  handler: (notifyRequest) =>
    handleNotifyMessage(
      notifyRequest,
      config.FISCAL_CODE_NOTIFICATION_BLACKLIST,
      telemetryClient,
      nhPartitionFactory,
    ),
  queueName: "%NOTIFY_MESSAGE_QUEUE_NAME%",
});

// ---------------------------------------------------------------------------
// HTTP Triggers
// ---------------------------------------------------------------------------

app.http("Info", {
  authLevel: "anonymous",
  handler: Info(cosmosdbClient),
  methods: ["GET"],
  route: "api/v1/info",
});

app.http("Notify", {
  authLevel: "function",
  handler: Notify(
    getUserProfileReader(profileModel),
    getUserSessionStatusReader(sessionManagerClient),
    getMessageWithContent(messageModel, blobService),
    getService(serviceModel),
    sendNotification(notifyQueueClient),
    telemetryClient,
  ),
  methods: ["POST"],
  route: "api/v1/notify",
});
