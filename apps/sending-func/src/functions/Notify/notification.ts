import { QueueClient } from "@azure/storage-queue";
import { FiscalCode, NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import * as E from "fp-ts/Either";
import * as TE from "fp-ts/TaskEither";
import { pipe } from "fp-ts/lib/function";

import { NotificationMessageKindEnum } from "../../generated/notifications/NotificationMessageKind";
import {
  KindEnum as NotifyKind,
  NotifyMessage,
} from "../../generated/notifications/NotifyMessage";
import { toHash } from "../../utils/crypto";

export const base64EncodeObject = (_: unknown): string =>
  Buffer.from(JSON.stringify(_)).toString("base64");

export type SendNotification = (
  fiscalCode: FiscalCode,
  messageId: NonEmptyString,
  notificationTitle: string,
  notificationBody: string,
) => TE.TaskEither<Error, void>;

const redirectOnNewPushNotifyQueue = (redirectPercentage: string): boolean => {
  const redirectionPercentage = parseFloat(redirectPercentage);
  return Math.random() < redirectionPercentage;
};

/**
 *
 * @param notificationQueueClient
 * @returns
 */
export const sendNotification =
  (
    notificationQueueClient: QueueClient,
    newNotificationQueueClient: QueueClient,
    redirectPercentage: string,
  ): SendNotification =>
  (
    fiscalCode,
    messageId,
    notificationTitle,
    notificationBody,
  ): ReturnType<SendNotification> =>
    pipe(
      {
        installationId: toHash(fiscalCode) as NonEmptyString,
        kind: NotifyKind[NotificationMessageKindEnum.Notify],
        payload: {
          message: notificationBody,
          message_id: messageId,
          title: notificationTitle,
        },
      },
      (notifyMessage: NotifyMessage) =>
        TE.tryCatch(() => {
          const queueClient = redirectOnNewPushNotifyQueue(redirectPercentage)
            ? newNotificationQueueClient
            : notificationQueueClient;

          return queueClient.sendMessage(base64EncodeObject(notifyMessage));
        }, E.toError),
      TE.mapLeft((err) =>
        Error(
          `Error while sending notify message to the queue [${err.message}]`,
        ),
      ),
      TE.map(() => void 0),
    );
