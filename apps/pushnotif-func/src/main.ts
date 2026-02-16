/**
 * Entry point for Azure Functions V4 Programming Model.
 *
 * All function registrations are done here instead of via function.json files.
 * HttpTrigger functions (Info, Notify) are temporarily excluded — they need
 * to be decoupled from Express before being registered here.
 */
import { app, output } from "@azure/functions";
import * as df from "durable-functions";

import { activityFunctionHandler as createOrUpdateActivityHandler } from "./functions/HandleNHCreateOrUpdateInstallationCallActivity";
import { handler as createOrUpdateOrchestratorHandler } from "./functions/HandleNHCreateOrUpdateInstallationCallOrchestrator";
import { activityFunctionHandler as deleteActivityHandler } from "./functions/HandleNHDeleteInstallationCallActivity";
import { handler as deleteOrchestratorHandler } from "./functions/HandleNHDeleteInstallationCallOrchestrator";
import { getHandler as getNotificationCallHandler } from "./functions/HandleNHNotificationCall/handler";
import { index as notifyMessageCallHandler } from "./functions/HandleNHNotifyMessageCallActivityQueue";

// ---------------------------------------------------------------------------
// Durable Functions — Activities
// ---------------------------------------------------------------------------
df.app.activity("HandleNHCreateOrUpdateInstallationCallActivity", {
  handler: createOrUpdateActivityHandler,
});

df.app.activity("HandleNHDeleteInstallationCallActivity", {
  handler: deleteActivityHandler,
});

// ---------------------------------------------------------------------------
// Durable Functions — Orchestrators
// ---------------------------------------------------------------------------
df.app.orchestration(
  "HandleNHCreateOrUpdateInstallationCallOrchestrator",
  createOrUpdateOrchestratorHandler,
);

df.app.orchestration(
  "HandleNHDeleteInstallationCallOrchestrator",
  deleteOrchestratorHandler,
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
  handler: notifyMessageCallHandler,
  queueName: "%NOTIFY_MESSAGE_QUEUE_NAME%",
});

// ---------------------------------------------------------------------------
// HTTP Triggers — TODO: migrate from Express to V4 programming model
// ---------------------------------------------------------------------------
// Info and Notify are currently disabled.
// They need to be decoupled from Express before being registered here.
// See src/functions/Info/index.ts and src/functions/Notify/index.ts
