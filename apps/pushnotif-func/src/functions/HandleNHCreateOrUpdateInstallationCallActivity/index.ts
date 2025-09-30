import { RetryOptions } from "durable-functions";

import { initTelemetryClient } from "../../utils/appinsights";
import { getConfigOrThrow } from "../../utils/config";
import { createActivity } from "../../utils/durable/activities";
import * as o from "../../utils/durable/orchestrators";
import { NotificationHubPartitionFactory } from "../../utils/notificationhubServicePartition";
import {
  ActivityInput,
  ActivityResultSuccess,
  getActivityBody,
} from "./handler";

export { ActivityInput, ActivityResultSuccess } from "./handler";

export const activityName = "HandleNHCreateOrUpdateInstallationCallActivity";

const config = getConfigOrThrow();

const telemetryClient = initTelemetryClient(config);

const nhPatitionFactory = new NotificationHubPartitionFactory(
  config.AZURE_NOTIFICATION_HUB_PARTITIONS,
);

const nhLegacyPatitionFactory = new NotificationHubPartitionFactory(
  config.AZURE_LEGACY_NOTIFICATION_HUB_PARTITIONS,
);

/**
 * Build a `CreateOrUpdateActivity` to be called by an Orchestrator
 *
 * @param retryOptions the options used to call a retry
 * @returns A callable `CreateOrUpdateActivity`
 */
export const getCallableActivity = (
  retryOptions: RetryOptions,
): o.CallableActivity<ActivityInput> =>
  o.callableActivity<ActivityInput>(
    activityName,
    ActivityResultSuccess,
    retryOptions,
  );

const activityFunctionHandler = createActivity(
  activityName,
  ActivityInput,
  ActivityResultSuccess,
  getActivityBody(nhPatitionFactory, nhLegacyPatitionFactory, telemetryClient),
);

export default activityFunctionHandler;
