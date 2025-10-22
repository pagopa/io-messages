import { useNewNotificationHub } from "@/utils/featureFlag";
import { AzureFunction, Context } from "@azure/functions";

import { initTelemetryClient } from "../../utils/appinsights";
import { getConfigOrThrow } from "../../utils/config";
import { NotificationHubPartitionFactory } from "../../utils/notificationhubServicePartition";
import { NhNotifyMessageResponse, handle } from "./handler";

const config = getConfigOrThrow();

const telemetryClient = initTelemetryClient(config);

const nhPatitionFactory = new NotificationHubPartitionFactory(
  config.AZURE_NOTIFICATION_HUB_PARTITIONS,
);

const newNhPatitionFactory = new NotificationHubPartitionFactory(
  config.AZURE_NEW_NOTIFICATION_HUB_PARTITIONS,
);

export const index: AzureFunction = (
  _: Context,
  notifyRequest: unknown,
): NhNotifyMessageResponse =>
  handle(
    notifyRequest,
    config.FISCAL_CODE_NOTIFICATION_BLACKLIST,
    telemetryClient,
    nhPatitionFactory,
    newNhPatitionFactory,
    useNewNotificationHub(
      config.NH_PARTITION_BETA_TESTER_LIST,
      config.NH_PARTITION_CANARY_USERS_REGEX,
      config.NH_PARTITION_FEATURE_FLAG,
    ),
  );
