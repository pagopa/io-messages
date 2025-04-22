import { NotificationHubsClient } from "@azure/notification-hubs";
import { FiscalCode } from "@pagopa/ts-commons/lib/strings";
import { TelemetryClient } from "applicationinsights";
import * as TE from "fp-ts/lib/TaskEither";
import { pipe } from "fp-ts/lib/function";
import * as t from "io-ts";

import { NotifyMessage } from "../generated/notifications/NotifyMessage";
import { toString } from "../utils/conversions";
import { toSHA256 } from "../utils/conversions";
import {
  ActivityBody,
  ActivityResultSuccess as ActivityResultSuccessBase,
  retryActivity,
} from "../utils/durable/activities";
import { notify } from "../utils/notification";
import { NotificationHubConfig } from "../utils/notificationhubServicePartition";

export const ActivityInput = t.interface({
  message: NotifyMessage,
  notificationHubConfig: NotificationHubConfig,
});

export type ActivityInput = t.TypeOf<typeof ActivityInput>;

export type ActivityResultSuccess = t.TypeOf<typeof ActivityResultSuccess>;
export const ActivityResultSuccess = t.intersection([
  ActivityResultSuccessBase,
  t.partial({ skipped: t.literal(true) }),
]);

/**
 * For each Notification Hub Message of type "Delete" calls related Notification Hub service
 */

export const getActivityBody =
  (
    telemetryClient: TelemetryClient,
    buildNHClient: (nhConfig: NotificationHubConfig) => NotificationHubsClient,
    fiscalCodeNotificationBlacklist: readonly FiscalCode[],
    // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  ): ActivityBody<ActivityInput, ActivityResultSuccess> =>
  ({ input, logger }) => {
    logger.info(`INSTALLATION_ID=${input.message.installationId}`);

    const nhClient = buildNHClient(input.notificationHubConfig);

    // If recipients are in blacklist, consider the operation successful
    const doNotify = fiscalCodeNotificationBlacklist
      .map(toSHA256)
      .includes(input.message.installationId) // by convention, installationId equals sha256 of user's fiscal code
      ? TE.of<Error, ActivityResultSuccess>(
          ActivityResultSuccess.encode({ kind: "SUCCESS", skipped: true }),
        )
      : pipe(
          notify(
            nhClient,
            input.message.payload,
            input.message.installationId,
            telemetryClient,
          ),
          TE.map(() =>
            ActivityResultSuccess.encode({
              kind: "SUCCESS",
            }),
          ),
        );

    return pipe(
      doNotify,
      TE.bimap(
        (e) => retryActivity(logger, toString(e)),
        ActivityResultSuccess.encode,
      ),
      TE.map((e) => {
        telemetryClient.trackEvent({
          name: "api.messages.notification.push.sent",
          properties: {
            dryRun: !!e.skipped,
            installationId: input.message.installationId,
            isSuccess: "true",
            messageId: input.message.payload.message_id,
            notificationHub: input.notificationHubConfig.AZURE_NH_HUB_NAME,
          },
          tagOverrides: { samplingEnabled: "false" },
        });

        return e;
      }),
    );
  };
