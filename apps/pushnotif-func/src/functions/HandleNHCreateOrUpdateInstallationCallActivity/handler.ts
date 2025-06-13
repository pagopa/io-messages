import { TelemetryClient } from "applicationinsights";
import * as TE from "fp-ts/lib/TaskEither";
import { pipe } from "fp-ts/lib/function";
import * as t from "io-ts";

import { InstallationId } from "../../generated/notifications/InstallationId";
import { Platform, PlatformEnum } from "../../generated/notifications/Platform";
import { toString } from "../../utils/conversions";
import {
  ActivityBody,
  ActivityResultSuccess,
  retryActivity,
} from "../../utils/durable/activities";
import { createOrUpdateInstallation } from "../../utils/notification";
import { NotificationHubPartitionFactory } from "../../utils/notificationhubServicePartition";

export type ActivityInput = t.TypeOf<typeof ActivityInput>;
export const ActivityInput = t.type({
  installationId: InstallationId,
  platform: Platform,
  pushChannel: t.string,
  tags: t.readonlyArray(t.string, "array of string"),
});

export { ActivityResultSuccess } from "../../utils/durable/activities";

export type ActivityBodyImpl = ActivityBody<
  ActivityInput,
  ActivityResultSuccess
>;

const getPlatformFromPlatformEnum = (
  platformEnum: PlatformEnum,
): "apns" | "fcmv1" => (platformEnum === "apns" ? "apns" : "fcmv1");

export const getActivityBody =
  (
    nhPartitionFactory: NotificationHubPartitionFactory,
    telemetryClient: TelemetryClient,
    // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  ): ActivityBodyImpl =>
  ({ input, logger }) => {
    logger.info(`INSTALLATION_ID=${input.installationId}`);
    return pipe(
      createOrUpdateInstallation(
        nhPartitionFactory.getPartition(input.installationId),
        input.installationId,
        getPlatformFromPlatformEnum(input.platform),
        input.pushChannel,
        input.tags,
      ),
      TE.bimap(
        (e) => {
          telemetryClient.trackEvent({
            name: "api.messages.notification.createOrUpdateInstallation.failure",
            properties: {
              installationId: input.installationId,
              isSuccess: "false",
              platform: input.platform,
              reason: e.message,
            },
            tagOverrides: { samplingEnabled: "false" },
          });
          return retryActivity(logger, toString(e));
        },
        () => {
          telemetryClient.trackEvent({
            name: "api.messages.notification.createOrUpdateInstallation.success",
            properties: {
              installationId: input.installationId,
              isSuccess: "true",
              platform: input.platform,
            },
            tagOverrides: { samplingEnabled: "false" },
          });
          return ActivityResultSuccess.encode({ kind: "SUCCESS" });
        },
      ),
    );
  };
