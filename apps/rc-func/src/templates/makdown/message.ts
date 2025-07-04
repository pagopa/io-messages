/* eslint-disable sort-keys */
import { IPrintersForTemplate } from "../printer";
import { OPEN_THE_APP_TO_READ_IT, YOU_HAVE_A_NEW_MESSAGE } from "./constant";

export const messagePrinter: IPrintersForTemplate = {
  silentPushPrinter: () => ({
    body: OPEN_THE_APP_TO_READ_IT,
    title: YOU_HAVE_A_NEW_MESSAGE,
  }),

  verbosePushPrinter: (ne) => ({
    body: ne.title,
    title: `${ne.organizationName}`,
  }),
};
