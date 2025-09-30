import { HttpHandler, HttpRequest, InvocationContext } from "@azure/functions";
import { lollipopHeadersSchema } from "io-messages-common/adapters/lollipop/definitions/lollipop-headers";
import { lollipopExtraInputsCtxKey } from "io-messages-common/adapters/lollipop/lollipop-middleware";

import {
  SendAARClientResponse,
  iunSchema,
  mandateIdSchema,
  problemJsonSchema,
  sendHeadersSchema,
} from "../send/definitions.js";
import NotificationClient, {
  NotificationClientError,
} from "../send/notification.js";
import { malformedBodyResponse } from "./commons/response.js";

export const getNotification =
  (getSendClient: (isTest: boolean) => NotificationClient): HttpHandler =>
  async (
    request: HttpRequest,
    context: InvocationContext,
  ): Promise<SendAARClientResponse> => {
    const isTest = request.query.get("isTest") === "true";
    const client = getSendClient(isTest);

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

    const iun = iunSchema.safeParse(request.params.iun);
    if (!iun.success) return malformedBodyResponse("Malformed request");

    const mandateId = request.query.has("mandateId")
      ? mandateIdSchema.safeParse(request.query.get("mandateId"))
      : { data: undefined, success: true };

    if (!mandateId.success) return malformedBodyResponse("Malformed request");

    try {
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
