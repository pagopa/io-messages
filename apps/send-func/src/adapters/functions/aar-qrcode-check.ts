import { QrCodeCheckUseCase } from "@/domain/use-cases/qr-code-check.js";
import { HttpRequest, InvocationContext } from "@azure/functions";
import { LollipopHeaders } from "io-messages-common/adapters/lollipop/definitions/lollipop-headers";
import { ExtentedHttpHandler } from "io-messages-common/adapters/middleware";

import {
  AarQRCodeCheckResponse,
  aarProblemJsonSchema,
  checkQrMandateRequestSchema,
} from "../send/definitions.js";
import {
  NotRecipientClientError,
  NotificationClientError,
} from "../send/notification.js";
import { malformedBodyResponse } from "./commons/response.js";

export const aarQRCodeCheck =
  (
    qrCodeCheckUseCase: QrCodeCheckUseCase,
  ): ExtentedHttpHandler<LollipopHeaders> =>
  async (
    request: HttpRequest,
    context: InvocationContext,
    lollipopHeaders: LollipopHeaders,
  ): Promise<AarQRCodeCheckResponse> => {
    const isTest = request.query.get("isTest") === "true";
    const sendHeaders = {
      "x-pagopa-cx-taxid": lollipopHeaders["x-pagopa-lollipop-user-id"],
      "x-pagopa-pn-io-src": "QR_CODE",
      ...lollipopHeaders,
    };

    let rawBody;
    try {
      rawBody = await request.json();
    } catch {
      return malformedBodyResponse("Invalid JSON body", "Bad Request");
    }

    const parsedBody = checkQrMandateRequestSchema.safeParse(rawBody);

    if (!parsedBody.success)
      return malformedBodyResponse(
        `Malformed aar qr code ${JSON.stringify(rawBody)}`,
        "Bad Request",
      );

    try {
      const response = await qrCodeCheckUseCase.execute(
        isTest,
        sendHeaders,
        parsedBody.data.aarQrCodeValue,
      );
      return { jsonBody: response, status: 200 };
    } catch (err) {
      if (err instanceof NotRecipientClientError) {
        context.error("NotRecipient client error:", err.message);
        return {
          jsonBody: err.body,
          status: 403,
        };
      }

      if (err instanceof NotificationClientError) {
        context.error("Notification client error:", err.message);

        return {
          jsonBody: aarProblemJsonSchema.parse(err.body),
          status: 500,
        };
      }

      const errorMessage =
        err instanceof Error ? err.message : JSON.stringify(err);
      context.error(err);
      return {
        jsonBody: {
          detail: errorMessage,
          status: 500,
          title: "Internal server error",
        },
        status: 500,
      };
    }
  };
