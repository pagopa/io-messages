/* eslint-disable @typescript-eslint/naming-convention */
import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import * as t from "io-ts";

import {
  NotificationType,
  NotificationTypeEnum,
} from "../generated/definitions/NotificationType";
import { messagePrinter } from "./makdown/message";
import { reminderPaymentPrinter } from "./makdown/reminderPayment";
import { reminderPaymentLastPrinter } from "./makdown/reminderPaymentLast";
import { reminderReadPrinter } from "./makdown/reminderRead";

export const NotificationEntry = t.interface({
  organizationName: NonEmptyString,
  serviceName: NonEmptyString,
  title: NonEmptyString,
});
export type NotificationEntry = t.TypeOf<typeof NotificationEntry>;

export interface NotificationPrinter {
  readonly body: string;
  readonly title: string;
}

export interface IPrintersForTemplate {
  readonly silentPushPrinter: (v: NotificationEntry) => NotificationPrinter;
  readonly verbosePushPrinter: (v: NotificationEntry) => NotificationPrinter;
}

const printersConfigurations: Readonly<
  Record<NotificationType, IPrintersForTemplate>
> = {
  [NotificationTypeEnum.MESSAGE]: messagePrinter,
  [NotificationTypeEnum.REMINDER_PAYMENT]: reminderPaymentPrinter,
  [NotificationTypeEnum.REMINDER_PAYMENT_LAST]: reminderPaymentLastPrinter,
  [NotificationTypeEnum.REMINDER_READ]: reminderReadPrinter,
};

export const getPrinterForTemplate = (
  notificationType: NotificationType,
): IPrintersForTemplate => printersConfigurations[notificationType];
