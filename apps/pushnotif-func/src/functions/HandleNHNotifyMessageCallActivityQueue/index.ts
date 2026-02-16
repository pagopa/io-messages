import { InvocationContext } from "@azure/functions";

import { initTelemetryClient } from "../../utils/appinsights";
import { getConfigOrThrow } from "../../utils/config";
import { NotificationHubPartitionFactory } from "../../utils/notificationhubServicePartition";
import { NhNotifyMessageResponse, handle } from "./handler";

const config = getConfigOrThrow();

const telemetryClient = initTelemetryClient(config);

const nhPatitionFactory = new NotificationHubPartitionFactory(
  config.AZURE_NOTIFICATION_HUB_PARTITIONS,
);

export const index = (
  notifyRequest: unknown,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _context: InvocationContext,
): NhNotifyMessageResponse =>
  handle(
    notifyRequest,
    config.FISCAL_CODE_NOTIFICATION_BLACKLIST,
    telemetryClient,
    nhPatitionFactory,
  );
