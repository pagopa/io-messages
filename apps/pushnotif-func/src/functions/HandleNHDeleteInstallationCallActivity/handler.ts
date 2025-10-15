import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import { TelemetryClient } from "applicationinsights";
import * as TE from "fp-ts/lib/TaskEither";
import { pipe } from "fp-ts/lib/function";
import * as t from "io-ts";

import { toString } from "../../utils/conversions";
import {
  ActivityBody,
  ActivityResultSuccess,
  failActivity,
} from "../../utils/durable/activities";
import { deleteInstallation } from "../../utils/notification";
import { NotificationHubPartitionFactory } from "../../utils/notificationhubServicePartition";

// Activity name for df
export const ActivityName = "HandleNHDeleteInstallationCallActivity";

// Activity input
export type ActivityInput = t.TypeOf<typeof ActivityInput>;
export const ActivityInput = t.type({
  installationId: NonEmptyString,
});

// Activity Result
export { ActivityResultSuccess } from "../../utils/durable/activities";

/**
 * For each Notification Hub Message of type "Delete" calls related Notification Hub service
 */
export const getActivityBody =
  (
    nhPartitionFactory: NotificationHubPartitionFactory,
    nhNewPartitionFactory: NotificationHubPartitionFactory,
    telemetryClient: TelemetryClient,
    // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  ): ActivityBody<ActivityInput, ActivityResultSuccess> =>
  ({ input, logger }) => {
    logger.info(`INSTALLATION_ID=${input.installationId}`);
    const nhClient = nhPartitionFactory.getPartition(input.installationId);
    const nhLegacyClient = nhNewPartitionFactory.getPartition(
      input.installationId,
    );

    return pipe(
      deleteInstallation(
        nhClient,
        nhLegacyClient,
        input.installationId,
        telemetryClient,
      ),
      TE.bimap(
        (e) => {
          telemetryClient.trackEvent({
            name: "api.messages.notification.deleteInstallation.failure",
            properties: {
              installationId: input.installationId,
              isSuccess: "false",
              reason: e.message,
            },
            tagOverrides: { samplingEnabled: "false" },
          });
          return failActivity(logger)(`ERROR=${toString(e)}`);
        },
        (response) => {
          telemetryClient.trackEvent({
            name: "api.messages.notification.deleteInstallation.success",
            properties: {
              installationId: input.installationId,
              isSuccess: "true",
            },
            tagOverrides: { samplingEnabled: "false" },
          });
          return ActivityResultSuccess.encode({ kind: "SUCCESS", ...response });
        },
      ),
    );
  };
