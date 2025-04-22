import { AzureFunction, Context } from "@azure/functions";

import { initTelemetryClient } from "../utils/appinsights";
import { getConfigOrThrow } from "../utils/config";
import {
  getNHLegacyConfig,
  getNotificationHubPartitionConfig,
} from "../utils/notificationhubServicePartition";
import { NhNotifyMessageResponse, handle } from "./handler";

const config = getConfigOrThrow();

const telemetryClient = initTelemetryClient(config);

const legacyNotificationHubConfig = getNHLegacyConfig(config);
const notificationHubConfigPartitionChooser =
  getNotificationHubPartitionConfig(config);

export const index: AzureFunction = (
  context: Context,
  notifyRequest: unknown,
): NhNotifyMessageResponse =>
  handle(
    notifyRequest,
    legacyNotificationHubConfig,
    notificationHubConfigPartitionChooser,
    config.FISCAL_CODE_NOTIFICATION_BLACKLIST,
    telemetryClient,
  );
