import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import { TelemetryClient } from "applicationinsights";
import { RetryOptions } from "durable-functions";
import * as TE from "fp-ts/lib/TaskEither";
import { pipe } from "fp-ts/lib/function";
import * as t from "io-ts";

import { ErrorNotFound } from "../domain/error";
import { InstallationSummaryRepository } from "../domain/mirror-service";
import { toString } from "../utils/conversions";
import {
  ActivityBody,
  ActivityResultFailure,
  ActivityResultSuccess,
  createActivity,
  failActivity,
  retryActivity,
} from "../utils/durable/activities";
import * as o from "../utils/durable/orchestrators";
import { deleteInstallation } from "../utils/notification";
import { NotificationHubPartitionFactory } from "../utils/notificationhub-service-partition";

// Activity name for df
export const ActivityName = "HandleNHDeleteInstallationCallActivity";

// Activity input
export type ActivityInput = t.TypeOf<typeof ActivityInput>;
export const ActivityInput = t.type({
  installationId: NonEmptyString,
});

// Activity Result
export { ActivityResultSuccess } from "../utils/durable/activities";

/**
 * For each Notification Hub Message of type "Delete" calls related Notification Hub service
 */
export const getActivityBody =
  (
    nhPartitionFactory: NotificationHubPartitionFactory,
    telemetryClient: TelemetryClient,
    installationRepository: InstallationSummaryRepository,
    // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  ): ActivityBody<ActivityInput, ActivityResultSuccess> =>
  ({ input, logger }) => {
    logger.info(`INSTALLATION_ID=${input.installationId}`);
    const nhClient = nhPartitionFactory.getPartition(input.installationId);

    // Mirror delete to cosmos' container installationSummary in order to have a copy of the installation in our db
    const mirrorDeleteToCosmos = TE.tryCatch(
      async () => {
        const nhPartition = installationRepository.computePartitionId(
          input.installationId,
        );

        const deleteResult =
          await installationRepository.deleteInstallationSummary(
            input.installationId,
            nhPartition,
          );
        if (deleteResult instanceof Error) {
          throw deleteResult;
        }
        return deleteResult;
      },
      (e) => (e instanceof Error ? e : new Error(toString(e))),
    );

    return pipe(
      mirrorDeleteToCosmos,
      TE.orElseW((error): TE.TaskEither<ActivityResultFailure, undefined> => {
        telemetryClient.trackException({
          exception:
            error instanceof Error ? error : new Error(toString(error)),
          properties: { installationId: input.installationId },
        });
        if (error instanceof ErrorNotFound) {
          // If the installation summary is not found in cosmos, we can consider it already deleted and proceed with NH deletion without retrying
          return TE.right(undefined);
        }
        return retryActivity(logger, toString(error));
      }),
      TE.chainW(() =>
        pipe(
          deleteInstallation(nhClient, input.installationId),
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
              return ActivityResultSuccess.encode({
                kind: "SUCCESS",
                ...response,
              });
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
  installationRepository: InstallationSummaryRepository,
  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
) =>
  createActivity<ActivityInput>(
    ActivityName,
    ActivityInput,
    ActivityResultSuccess,
    getActivityBody(
      nhPartitionFactory,
      telemetryClient,
      installationRepository,
    ),
  );
