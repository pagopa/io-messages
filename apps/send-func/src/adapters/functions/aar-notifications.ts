import {
  HttpHandler,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import { lollipopHeadersSchema } from "io-messages-common/adapters/lollipop/definitions/lollipop-headers";
import { lollipopExtraInputsCtxKey } from "io-messages-common/adapters/lollipop/lollipop-middleware";

import {
  iunSchema,
  mandateIdSchema,
  problemJsonSchema,
  sendHeadersSchema,
} from "../send/definitions.js";
import NotificationClient, {
  NotificationClientError,
} from "../send/notification.js";

export const getNotification =
  (
    notificationClient: NotificationClient,
    uatNotificationClient: NotificationClient,
  ): HttpHandler =>
  async (
    request: HttpRequest,
    context: InvocationContext,
  ): Promise<HttpResponseInit> => {
    try {
      const isTest = request.query.get("isTest") === "true";
      const client = isTest ? uatNotificationClient : notificationClient;

      const lollipopHeaders = lollipopHeadersSchema.safeParse(
        context.extraInputs.get(lollipopExtraInputsCtxKey),
      );

      const sendHeaders = sendHeadersSchema.safeParse({
        "x-pagopa-cx-taxid": request.headers.get("x-pagopa-cx-taxid"),
        "x-pagopa-pn-io-src":
          request.headers.get("x-pagopa-pn-io-src") || undefined,
        ...lollipopHeaders.data,
      });

      if (!lollipopHeaders.success || !sendHeaders.success) {
        return {
          jsonBody: {
            detail: "Malformed headers",
            status: 400,
          },
          status: 400,
        };
      }

      const iun = iunSchema.safeParse(request.params.iun);
      const mandateId = request.query.has("mandateId")
        ? mandateIdSchema.safeParse(request.query.get("mandateId"))
        : { data: undefined, success: true };

      if (!iun.success || !mandateId.success) {
        return {
          jsonBody: {
            detail: "Malformed request",
            status: 400,
          },
          status: 400,
        };
      }

      const response = await client.getReceivedNotification(
        iun.data,
        sendHeaders.data,
        mandateId.data,
      );

      return { jsonBody: response, status: 200 };
    } catch (err) {
      if (
        err instanceof NotificationClientError &&
        err.name === "NotificationClientError"
      ) {
        context.error("Notification client error:", err.message);

        const problemJson = problemJsonSchema.parse(err.body);

        return {
          jsonBody: problemJson,
          status: 500,
        };
      }

      return {
        jsonBody: {
          detail: "Internal server error",
          status: 500,
        },
        status: 500,
      };
    }
  };
