import { FunctionOutput, InvocationContext } from "@azure/functions";
import * as df from "durable-functions";
import * as T from "fp-ts/Task";
import { pipe } from "fp-ts/lib/function";
import * as t from "io-ts";

import { CreateOrUpdateInstallationMessage } from "../../generated/notifications/CreateOrUpdateInstallationMessage";
import { KindEnum as CreateOrUpdateKind } from "../../generated/notifications/CreateOrUpdateInstallationMessage";
import { DeleteInstallationMessage } from "../../generated/notifications/DeleteInstallationMessage";
import { KindEnum as DeleteKind } from "../../generated/notifications/DeleteInstallationMessage";
import { NotifyMessage } from "../../generated/notifications/NotifyMessage";
import { KindEnum as NotifyKind } from "../../generated/notifications/NotifyMessage";
import { toString } from "../../utils/conversions";
import { NhNotifyMessageRequest, NhTarget } from "../../utils/types";
import { OrchestratorName as CreateOrUpdateInstallationOrchestrator } from "../HandleNHCreateOrUpdateInstallationCallOrchestrator/handler";
import { OrchestratorName as DeleteInstallationOrchestratorName } from "../HandleNHDeleteInstallationCallOrchestrator/handler";

export const NotificationMessage = t.union([
  NotifyMessage,
  CreateOrUpdateInstallationMessage,
  DeleteInstallationMessage,
]);

export type NotificationHubMessage = t.TypeOf<typeof NotificationMessage>;

const notifyMessage = (
  context: InvocationContext,
  notifyQueueOutput: FunctionOutput,
  message: NotifyMessage,
): Promise<string> =>
  pipe(
    NhTarget.encode("current"),
    T.of,
    T.map((target) => NhNotifyMessageRequest.encode({ message, target })),
    T.map((m) => Buffer.from(JSON.stringify(m)).toString("base64")),
    T.map((notifyMessages) =>
      context.extraOutputs.set(notifyQueueOutput, notifyMessages),
    ),
    T.map(() => "-1"), // There is no orchestrator_id to return
  )();

const startOrchestrator = async (
  notificationHubMessage: NotificationHubMessage,
  context: InvocationContext,
  client: df.DurableClient,
  notifyQueueOutput: FunctionOutput,
): Promise<string> => {
  switch (notificationHubMessage.kind) {
    case DeleteKind.DeleteInstallation:
      return await client.startNew(
        DeleteInstallationOrchestratorName,
        {
          input: {
            message: notificationHubMessage,
          },
        },
      );
    case CreateOrUpdateKind.CreateOrUpdateInstallation:
      return await client.startNew(
        CreateOrUpdateInstallationOrchestrator,
        {
          input: {
            message: notificationHubMessage,
          },
        },
      );
    case NotifyKind.Notify:
      return await notifyMessage(
        context,
        notifyQueueOutput,
        notificationHubMessage,
      );
    default:
      context.error(
        `HandleNHNotificationCall|ERROR=Unknown message kind, message: ${toString(
          notificationHubMessage,
        )}`,
      );
      throw new Error(
        `Unknown message kind, message: ${toString(notificationHubMessage)}`,
      );
  }
};

/**
 * Invoke Orchestrator to manage Notification Hub Service call with data provided by an enqueued message
 */
export const getHandler =
  (notifyQueueOutput: FunctionOutput) =>
  async (
    notificationHubMessage: unknown,
    context: InvocationContext,
  ): Promise<void> => {
    const client = df.getClient(context);

    await startOrchestrator(
      notificationHubMessage as NotificationHubMessage,
      context,
      client,
      notifyQueueOutput,
    );
  };
