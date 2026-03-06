import { TelemetryClient } from "applicationinsights";
import { RetryOptions } from "durable-functions";
import * as TE from "fp-ts/lib/TaskEither";
import { pipe } from "fp-ts/lib/function";
import * as t from "io-ts";

import { InstallationRepository } from "../domain/mirror-service";
import { InstallationId } from "../generated/notifications/InstallationId";
import { Platform, PlatformEnum } from "../generated/notifications/Platform";
import { toString } from "../utils/conversions";
import {
  ActivityBody,
  ActivityResultFailure,
  ActivityResultSuccess,
  createActivity,
  retryActivity,
} from "../utils/durable/activities";
import * as o from "../utils/durable/orchestrators";
import { createOrUpdateInstallation } from "../utils/notification";
import { NotificationHubPartitionFactory } from "../utils/notificationhub-service-partition";

// Activity name for df
export const ActivityName = "HandleNHCreateOrUpdateInstallationCallActivity";

export type ActivityInput = t.TypeOf<typeof ActivityInput>;
export const ActivityInput = t.type({
  installationId: InstallationId,
  platform: Platform,
  pushChannel: t.string,
  tags: t.readonlyArray(t.string, "array of string"),
});

export { ActivityResultSuccess } from "../utils/durable/activities";

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
    installationRepository: InstallationRepository,
    // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  ): ActivityBodyImpl =>
  ({ input, logger }) => {
    logger.info(`INSTALLATION_ID=${input.installationId}`);

    // Mirror create/update to cosmos
    const mirrorCall = TE.tryCatch(
      () =>
        installationRepository.createOrUpdateInstallation({
          id: input.installationId,
          nhPartition: installationRepository.computePartitionId(
            input.installationId,
          ),
          platform: getPlatformFromPlatformEnum(input.platform),
          updatedAt: Date.now(),
        }),
      (e) => (e instanceof Error ? e : new Error(toString(e))),
    );

    return pipe(
      mirrorCall,
      TE.orElseW((error): TE.TaskEither<ActivityResultFailure, never> => {
        telemetryClient.trackException({
          exception:
            error instanceof Error ? error : new Error(toString(error)),
          properties: { installationId: input.installationId },
        });

        return retryActivity(logger, toString(error));
      }),
      TE.chainW(() =>
        pipe(
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
        ),
      ),
    );
  };

export const getCallableActivity = (
  retryOptions: RetryOptions,
): o.CallableActivity<ActivityInput> =>
  o.callableActivity<ActivityInput>(
    ActivityName,
    ActivityResultSuccess,
    retryOptions,
  );

export const getActivityHandler = (
  nhPartitionFactory: NotificationHubPartitionFactory,
  telemetryClient: TelemetryClient,
  installationRepository: InstallationRepository,
  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
) =>
  createActivity(
    ActivityName,
    ActivityInput,
    ActivityResultSuccess,
    getActivityBody(
      nhPartitionFactory,
      telemetryClient,
      installationRepository,
    ),
  );
