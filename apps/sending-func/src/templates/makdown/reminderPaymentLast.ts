/* eslint-disable sort-keys */
import { IPrintersForTemplate } from "../printer";
import {
  OPEN_THE_APP_TO_PAY_IT,
  YOU_HAVE_A_NOTICE_EXPIRING_TOMORROW,
} from "./constant";

export const reminderPaymentLastPrinter: IPrintersForTemplate = {
  silentPushPrinter: () => ({
    body: OPEN_THE_APP_TO_PAY_IT,
    title: YOU_HAVE_A_NOTICE_EXPIRING_TOMORROW,
  }),

  verbosePushPrinter: (ne) => ({
    body: `Entra nell’app e paga l’avviso emesso da ${ne.organizationName}`,
    title: YOU_HAVE_A_NOTICE_EXPIRING_TOMORROW,
  }),
};
