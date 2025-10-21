import { iunSchema, mandateIdSchema } from "@/domain/notification.js";
import { GetNotificationUseCase } from "@/domain/use-cases/get-notification.js";
import { HttpRequest, InvocationContext } from "@azure/functions";
import { LollipopHeaders } from "io-messages-common/adapters/lollipop/definitions/lollipop-headers";
import { ExtentedHttpHandler } from "io-messages-common/adapters/middleware";

import {
  AarGetNotificationResponse,
  aarProblemJsonSchema,
} from "../send/definitions.js";
import { NotificationClientError } from "../send/notification.js";
import { malformedBodyResponse } from "./commons/response.js";
import { TelemetryEventName, TelemetryService } from "@/domain/telemetry.js";

export const getNotification =
  (
    getNotificationUseCase: GetNotificationUseCase,
    telemetryService: TelemetryService,
  ): ExtentedHttpHandler<LollipopHeaders> =>
  async (
    request: HttpRequest,
    context: InvocationContext,
    lollipopHeaders: LollipopHeaders,
  ): Promise<AarGetNotificationResponse> => {
    const isTest = request.query.get("isTest") === "true";

    const sendHeaders = {
      "x-pagopa-cx-taxid": lollipopHeaders["x-pagopa-lollipop-user-id"],
      "x-pagopa-pn-io-src": "QR_CODE",
      ...lollipopHeaders,
    };

    const iun = iunSchema.safeParse(request.params.iun);
    if (!iun.success)
      return malformedBodyResponse(
        `Malformed iun ${request.params.iun}`,
        "Bad Request",
      );

    const mandateId = request.query.get("mandateId") || undefined;
    const parsedMandateId = mandateId
      ? mandateIdSchema.safeParse(mandateId)
      : { data: mandateId, success: true };

    if (!parsedMandateId.success)
      return malformedBodyResponse(
        `Malformed mandateId ${mandateId}`,
        "Bad Request",
      );
    try {
      const response = await getNotificationUseCase.execute(
        isTest,
        sendHeaders,
        iun.data,
        parsedMandateId.data,
      );

      return { jsonBody: response, status: 200 };
    } catch (err) {
      if (err instanceof NotificationClientError) {
        context.error("Notification client error:", err.message);

        telemetryService.trackEvent(
          TelemetryEventName.SEND_INTERNAL_SERVER_ERROR,
          {
            status: err.status,
          },
        );

        return {
          jsonBody: aarProblemJsonSchema.parse(err.body),
          status: 500,
        };
      }

      const errorMessage =
        err instanceof Error ? err.message : JSON.stringify(err);

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
