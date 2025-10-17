import { getIsUserEligibleForNewFeature } from "@/utils/featureFlag";
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

const useNewNotifHub = getIsUserEligibleForNewFeature(
  (i: string) => config.NH_PARTITION_BETA_TESTER_LIST.includes(i),
  (i: string) => {
    const regex = new RegExp(config.NH_PARTITION_CANARY_USERS_REGEX);
    return regex.test(i);
  },
  config.NH_PARTITION_FEATURE_FLAG,
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
    useNewNotifHub,
  );
