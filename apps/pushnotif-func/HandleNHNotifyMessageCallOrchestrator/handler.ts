import { Task } from "durable-functions/lib/src/classes";
import * as t from "io-ts";

import { getCallableActivity as getNotifyCallableActivity } from "../HandleNHNotifyMessageCallActivity";
import { NotifyMessage } from "../generated/notifications/NotifyMessage";
import { createOrchestrator } from "../utils/durable/orchestrators";
import {
  NotificationHubConfig,
  getNotificationHubPartitionConfig,
} from "../utils/notificationhubServicePartition";

export const OrchestratorName = "HandleNHNotifyMessageCallOrchestrator";

/**
 * Carries information about Notification Hub Message payload
 */
export const NhNotifyMessageOrchestratorCallInput = t.interface({
  message: NotifyMessage,
});

export type NhNotifyMessageOrchestratorCallInput = t.TypeOf<
  typeof NhNotifyMessageOrchestratorCallInput
>;

interface IHandlerParams {
  readonly legacyNotificationHubConfig: NotificationHubConfig;
  readonly notificationHubConfigPartitionChooser: ReturnType<
    typeof getNotificationHubPartitionConfig
  >;
  readonly notifyMessageActivity: ReturnType<typeof getNotifyCallableActivity>;
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export const getHandler = ({
  legacyNotificationHubConfig,
  notificationHubConfigPartitionChooser,
  notifyMessageActivity,
}: IHandlerParams) =>
  createOrchestrator(
    OrchestratorName,
    NhNotifyMessageOrchestratorCallInput,
    function* ({
      context,
      input: { message },
      logger,
    }): Generator<Task, void, Task> {
      const { installationId } = message;

      yield* notifyMessageActivity(context, {
        message,
        notificationHubConfig: legacyNotificationHubConfig,
      });

      const notificationHubConfigPartition =
        notificationHubConfigPartitionChooser(installationId);

      logger.info(
        `Pushing the message to user ${installationId} on Notification Hub ${notificationHubConfigPartition.AZURE_NH_HUB_NAME}`,
      );

      yield* notifyMessageActivity(context, {
        message,
        notificationHubConfig: notificationHubConfigPartition,
      });
    },
  );
