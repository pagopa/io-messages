/**
 * Entry point for Azure Functions V4 Programming Model.
 *
 * All function registrations are done here instead of via function.json files.
 * HttpTrigger functions (Info, Notify) are temporarily excluded — they need
 * to be decoupled from Express before being registered here.
 */
import { app, output } from "@azure/functions";
import * as df from "durable-functions";
import { RetryOptions } from "durable-functions";

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
import { initTelemetryClient } from "./utils/appinsights";
import { getConfigOrThrow } from "./utils/config";
import { NotificationHubPartitionFactory } from "./utils/notificationhubServicePartition";

// ---------------------------------------------------------------------------
// Shared configuration and dependencies
// ---------------------------------------------------------------------------
const config = getConfigOrThrow();
const telemetryClient = initTelemetryClient(config);

const nhPartitionFactory = new NotificationHubPartitionFactory(
  config.AZURE_NOTIFICATION_HUB_PARTITIONS,
);

const retryOptions = new RetryOptions(5000, config.RETRY_ATTEMPT_NUMBER);
retryOptions.backoffCoefficient = 1.5;

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
// HTTP Triggers — TODO: migrate from Express to V4 programming model
// ---------------------------------------------------------------------------
// Info and Notify are currently disabled.
// They need to be decoupled from Express before being registered here.
// See src/functions/Info/index.ts and src/functions/Notify/index.ts
