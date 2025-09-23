import {
  HttpHandler,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import { lollipopExtraInputsCtxKey } from "io-messages-common/adapters/lollipop/lollipop-middleware";

import {
  checkQrMandateRequestSchema,
  checkQrMandateResponseSchema,
  problemJsonSchema,
  sendHeadersSchema,
} from "../send/definitions.js";
import NotificationClient, {
  NotificationClientError,
} from "../send/notification.js";

export const aarQRCodeCheck =
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

      const sendHeaders = sendHeadersSchema.parse(
        context.extraInputs.get(lollipopExtraInputsCtxKey),
      );
      const rawBody = await request.json();
      const parsedBody = checkQrMandateRequestSchema.parse(rawBody);

      const response = await client.checkAarQrCodeIO(
        parsedBody.aarQrCodeValue,
        sendHeaders,
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

        if (err.status === 403) {
          return {
            jsonBody: {
              detail: "Internal server error",
              errors: checkQrMandateResponseSchema.parse(err.body),
              status: err.status,
            },
            status: 500,
          };
        }

        return {
          jsonBody: {
            detail: "Internal server error",
            errors: problemJsonSchema.parse(err.body).body,
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
