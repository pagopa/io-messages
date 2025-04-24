/* eslint-disable sort-keys */
import { IPrintersForTemplate } from "../printer";
import {
  OPEN_THE_APP_TO_READ_IT,
  YOU_HAVE_AN_UNREAD_MESSAGE,
} from "./constant";

export const reminderReadPrinter: IPrintersForTemplate = {
  silentPushPrinter: () => ({
    body: OPEN_THE_APP_TO_READ_IT,
    title: YOU_HAVE_AN_UNREAD_MESSAGE,
  }),

  verbosePushPrinter: (ne) => ({
    body: ne.title,
    title: `Leggi il messaggio da ${ne.organizationName}`,
  }),
};
