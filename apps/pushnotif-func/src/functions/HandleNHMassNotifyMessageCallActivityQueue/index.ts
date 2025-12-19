import { AzureFunction, Context } from "@azure/functions";

import { initTelemetryClient } from "../../utils/appinsights";
import { getConfigOrThrow } from "../../utils/config";
import { NotificationHubPartitionFactory } from "../../utils/notificationhubServicePartition";
import { NhMassNotifyMessageResponse, handle } from "./handler";

const config = getConfigOrThrow();

const telemetryClient = initTelemetryClient(config);

const nhPatitionFactory = new NotificationHubPartitionFactory(
  config.AZURE_NOTIFICATION_HUB_PARTITIONS,
);

export const index: AzureFunction = (
  _: Context,
  notifyRequest: unknown,
): NhMassNotifyMessageResponse =>
  handle(notifyRequest, telemetryClient, nhPatitionFactory);
