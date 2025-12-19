import { QueueClient } from "@azure/storage-queue";
import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import { MassNotifyMessage } from "./mass-notify.dto";

import { MassNotifyKind } from "./mass-notify.dto";

export const base64EncodeObject = (_: unknown): string =>
  Buffer.from(JSON.stringify(_)).toString("base64");

export type SendNotification = (
  notificationTitle: NonEmptyString,
  notificationBody: NonEmptyString,
  template: NonEmptyString,
  tags: ReadonlyArray<NonEmptyString>,
) => Promise<void>;

/**
 *
 * @param notificationQueueClient
 * @returns
 */
export const sendNotification =
  (notificationQueueClient: QueueClient): SendNotification =>
  (notificationTitle, notificationBody, template, tags): ReturnType<any> => {
    const notifyMessage: MassNotifyMessage = {
      kind: MassNotifyKind[MassNotifyKind.Generic],
      template: template,
      tags: tags,
      payload: {
        message: notificationBody,
        title: notificationTitle,
      },
    };

    return notificationQueueClient.sendMessage(
      base64EncodeObject(notifyMessage),
    );
  };
