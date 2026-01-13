import { AzureFunction, Context } from "@azure/functions";

import { initTelemetryClient } from "../../utils/appinsights";
import { getConfigOrThrow } from "../../utils/config";
import { NotificationHubPartitionFactory } from "../../utils/notificationhubServicePartition";
import { handle } from "./handler";
import { NotificationHubsMessageResponse } from "@azure/notification-hubs";

const config = getConfigOrThrow();

const telemetryClient = initTelemetryClient(config);

const nhPartitionFactory = new NotificationHubPartitionFactory(
  config.AZURE_NOTIFICATION_HUB_PARTITIONS,
);

export const index: AzureFunction = async (
  _: Context,
  notifyRequest: unknown,
): Promise<NotificationHubsMessageResponse> =>
  await handle(notifyRequest, telemetryClient, nhPartitionFactory);
