import {
  HttpHandler,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import { lollipopHeadersSchema } from "io-messages-common/adapters/lollipop/definitions/lollipop-headers";
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

      const rawBody = await request.json();
      const parsedBody = checkQrMandateRequestSchema.safeParse(rawBody);
      if (!parsedBody.success) {
        return {
          jsonBody: {
            detail: "Malformed body",
            status: 400,
          },
          status: 400,
        };
      }

      const { aarQrCodeValue } = parsedBody.data;
      const response = await client.checkAarQrCodeIO(
        aarQrCodeValue,
        sendHeaders.data,
      );
      return { jsonBody: response, status: 200 };
    } catch (err) {
      if (
        err instanceof NotificationClientError &&
        err.name === "NotificationClientError"
      ) {
        context.error("Notification client error:", err.message);

        if (err.status === 403) {
          return {
            jsonBody: checkQrMandateResponseSchema.parse(err.body),
            status: 403,
          };
        }

        return {
          jsonBody: {
            detail: "Internal server error",
            errors: problemJsonSchema.parse(err.body).errors,
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
