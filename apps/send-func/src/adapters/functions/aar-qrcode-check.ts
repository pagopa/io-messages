import { TelemetryEventName, TelemetryService } from "@/domain/telemetry.js";
import { QrCodeCheckUseCase } from "@/domain/use-cases/qr-code-check.js";
import { HttpRequest, InvocationContext } from "@azure/functions";
import { LollipopHeaders } from "io-messages-common/adapters/lollipop/definitions/lollipop-headers";
import { ExtentedHttpHandler } from "io-messages-common/adapters/middleware";

import {
  AarQRCodeCheckResponse,
  checkQrMandateRequestSchema,
} from "../send/definitions.js";
import {
  NotRecipientClientError,
  NotificationClientError,
} from "../send/notification.js";
import {
  malformedBodyResponse,
  sendProblemToAARProblemJson,
} from "./commons/response.js";

export const aarQRCodeCheck =
  (
    qrCodeCheckUseCase: QrCodeCheckUseCase,
    telemetryService: TelemetryService,
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
        //SEND returns 403. It will start the user delegation mobile flow
        return {
          jsonBody: err.body,
          status: 403,
        };
      }

      if (err instanceof NotificationClientError) {
        context.error("Notification client error:", err.message);

        switch (err.status) {
          case 403:
            telemetryService.trackEvent(
              TelemetryEventName.MALFORMED_403_SEND_RESPONSE,
            );
            break;
          case 404:
            telemetryService.trackEvent(
              TelemetryEventName.NOT_FOUND_AAR_SEND_DATA,
            );
            break;
          default:
            telemetryService.trackEvent(
              TelemetryEventName.SEND_INTERNAL_SERVER_ERROR,
              {
                status: err.status,
              },
            );
            break;
        }

        return {
          jsonBody: sendProblemToAARProblemJson(err.body),
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
