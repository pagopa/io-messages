import { Context } from "@azure/functions";
import * as df from "durable-functions";
import { DurableOrchestrationClient } from "durable-functions/lib/src/durableorchestrationclient";
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
  context: Context,
  message: NotifyMessage,
): Promise<string> =>
  pipe(
    NhTarget.encode("current"),
    T.of,
    T.map((target) => NhNotifyMessageRequest.encode({ message, target })),
    T.map((m) => Buffer.from(JSON.stringify(m)).toString("base64")),
    T.map(
      (notifyMessages) => (context.bindings.notifyMessages = notifyMessages),
    ),
    T.map(() => "-1"), // There is no orchestrator_id to return
  )();

const startOrchestrator = async (
  notificationHubMessage: NotificationHubMessage,
  context: Context,
  client: DurableOrchestrationClient,
): Promise<string> => {
  switch (notificationHubMessage.kind) {
    case DeleteKind.DeleteInstallation:
      return await client.startNew(
        DeleteInstallationOrchestratorName,
        undefined,
        {
          message: notificationHubMessage,
        },
      );
    case CreateOrUpdateKind.CreateOrUpdateInstallation:
      return await client.startNew(
        CreateOrUpdateInstallationOrchestrator,
        undefined,
        {
          message: notificationHubMessage,
        },
      );
    case NotifyKind.Notify:
      return await notifyMessage(context, notificationHubMessage);
    default:
      context.log.error(
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
 * Invoke Orchestrator to manage Notification Hub Service call with data provided by an enqued message
 */
export const getHandler =
  () =>
  async (
    context: Context,
    notificationHubMessage: NotificationHubMessage,
  ): Promise<string> => {
    const client = df.getClient(context);

    return startOrchestrator(notificationHubMessage, context, client);
  };
