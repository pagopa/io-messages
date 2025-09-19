import {
  HttpHandler,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import { lollipopExtraInputsCtxKey } from "io-messages-common/adapters/lollipop/lollipop-middleware";

import {
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
      const sendHeaders = sendHeadersSchema.parse(
        context.extraInputs.get(lollipopExtraInputsCtxKey),
      );
      const iun = request.params.iun;

      const client = isTest ? uatNotificationClient : notificationClient;
      const mandateId = request.query.has("mandateId")
        ? mandateIdSchema.parse(request.query.get("mandateId"))
        : undefined;

      const response = await client.getReceivedNotification(
        iun,
        sendHeaders,
        mandateId,
      );

      return { jsonBody: response, status: 200 };
    } catch (err) {
      if (err instanceof Error && err.name === "ZodError") {
        context.error("AARQrCodeCheck malformed request:", err.message);
        return {
          jsonBody: {
            detail: "Malformed request",
            errors: [JSON.stringify(err.message)],
            status: 400,
          },
          status: 400,
        };
      }

      if (
        err instanceof NotificationClientError &&
        err.name === "NotificationClientError"
      ) {
        context.error("Notification client error:", err.message);

        const problemJson = problemJsonSchema.parse(err.body);

        return {
          jsonBody: {
            detail: "Internal server error",
            errors: problemJson.errors,
            status: err.status,
          },
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
