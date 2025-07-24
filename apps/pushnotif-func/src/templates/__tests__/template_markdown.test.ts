import { getOrElseW } from "fp-ts/lib/Either";
import { pipe } from "fp-ts/lib/function";
import { describe, expect, it } from "vitest";

import { messagePrinter } from "../makdown/message";
import { reminderPaymentPrinter } from "../makdown/reminderPayment";
import { reminderPaymentLastPrinter } from "../makdown/reminderPaymentLast";
import { reminderReadPrinter } from "../makdown/reminderRead";
import { NotificationEntry } from "../printer";

const notificationMessage = {
  organizationName: "TEST ORG",
  serviceName: "TEST SERVICE",
  title: "TEST OBJECT",
};

describe.each([
  { printer: messagePrinter, test: "MESSAGE" },
  { printer: reminderReadPrinter, test: "REMINDER_READ" },
  { printer: reminderPaymentPrinter, test: "REMINDER_PAYMENT" },
  { printer: reminderPaymentLastPrinter, test: "REMINDER_PAYMENT_LAST" },
])(`Printer - Template - %s`, ({ printer }) => {
  it("should print a silent notification", () => {
    const notification = pipe(
      NotificationEntry.decode(notificationMessage),
      getOrElseW(() => {
        throw "Error decoding object";
      }),
    );

    const result = printer.silentPushPrinter(notification);
    expect(result).toMatchSnapshot();
  });

  it("should print a verbose notification", () => {
    const notification = pipe(
      NotificationEntry.decode(notificationMessage),
      getOrElseW(() => {
        throw "Error decoding object";
      }),
    );

    const result = printer.verbosePushPrinter(notification);
    expect(result).toMatchSnapshot();
  });
});
