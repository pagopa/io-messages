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
import { malformedBodyResponse } from "./commons/response.js";

export const aarQRCodeCheck =
  (
    notificationClient: NotificationClient,
    uatNotificationClient: NotificationClient,
  ): HttpHandler =>
  async (
    request: HttpRequest,
    context: InvocationContext,
  ): Promise<HttpResponseInit> => {
    const isTest = request.query.get("isTest") === "true";
    const client = isTest ? uatNotificationClient : notificationClient;

    const lollipopHeaders = lollipopHeadersSchema.safeParse(
      context.extraInputs.get(lollipopExtraInputsCtxKey),
    );
    if (!lollipopHeaders.success)
      return malformedBodyResponse("Malformed headers");

    const sendHeaders = sendHeadersSchema.safeParse({
      "x-pagopa-cx-taxid": request.headers.get("x-pagopa-cx-taxid"),
      "x-pagopa-pn-io-src":
        request.headers.get("x-pagopa-pn-io-src") || undefined,
      ...lollipopHeaders.data,
    });

    if (!sendHeaders.success) return malformedBodyResponse("Malformed headers");

    let rawBody;
    try {
      rawBody = await request.json();
    } catch {
      return malformedBodyResponse("Invalid JSON body");
    }

    const parsedBody = checkQrMandateRequestSchema.safeParse(rawBody);

    if (!parsedBody.success) return malformedBodyResponse("Malformed body");

    try {
      const response = await client.checkAarQrCodeIO(
        parsedBody.data.aarQrCodeValue,
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
