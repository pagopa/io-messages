import {
  CIEValidationDataSchema,
  mandateIdSchema,
} from "@/domain/notification.js";
import { TelemetryEventName, TelemetryService } from "@/domain/telemetry.js";
import { AcceptNotificationMandateUseCase } from "@/domain/use-cases/accept-notification-mandate.js";
import { CreateNotificationMandateUseCase } from "@/domain/use-cases/create-notification-mandate.js";
import {
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import { LollipopHeaders } from "io-messages-common/adapters/lollipop/definitions/lollipop-headers";
import { ExtentedHttpHandler } from "io-messages-common/adapters/middleware";

import {
  CreateNotificationMandateResponse,
  checkQrMandateRequestSchema,
} from "../send/definitions.js";
import {
  NotificationCLientAuthError,
  NotificationClientError,
} from "../send/notification.js";
import {
  malformedBodyResponse,
  sendAuthErrorToAARProblemJson,
  sendProblemToAARProblemJson,
} from "./commons/response.js";

export const createNotificationMandate =
  (
    createNotificationMandateUseCase: CreateNotificationMandateUseCase,
    telemetryService: TelemetryService,
  ): ExtentedHttpHandler<LollipopHeaders> =>
  async (
    request: HttpRequest,
    context: InvocationContext,
    lollipopHeaders: LollipopHeaders,
  ): Promise<CreateNotificationMandateResponse> => {
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
      const response = await createNotificationMandateUseCase.execute(
        isTest,
        sendHeaders,
        parsedBody.data.aarQrCodeValue,
      );
      return { jsonBody: response, status: 200 };
    } catch (err) {
      if (err instanceof NotificationClientError) {
        context.error("Notification client error:", err.message);

        switch (err.status) {
          case 403:
            telemetryService.trackEvent(
              TelemetryEventName.SEND_AAR_CREATE_MANDATE_MALFORMED_403,
            );
            break;
          case 404:
            telemetryService.trackEvent(
              TelemetryEventName.SEND_AAR_CREATE_MANDATE_QRCODE_DATA_NOT_FOUND,
            );
            break;
          default:
            telemetryService.trackEvent(
              TelemetryEventName.SEND_AAR_CREATE_MANDATE_SERVER_ERROR,
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

      if (err instanceof NotificationCLientAuthError) {
        return {
          jsonBody: sendAuthErrorToAARProblemJson(err, err.status),
          status: err.status,
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

export const acceptNotificationMandate =
  (
    acceptNotificationMandateUseCase: AcceptNotificationMandateUseCase,
    telemetryService: TelemetryService,
  ): ExtentedHttpHandler<LollipopHeaders> =>
  async (
    request: HttpRequest,
    context: InvocationContext,
    lollipopHeaders: LollipopHeaders,
  ): Promise<HttpResponseInit> => {
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

    const parsedBody = CIEValidationDataSchema.safeParse(rawBody);

    if (!parsedBody.success)
      return malformedBodyResponse(
        `Malformed CIE validation data ${JSON.stringify(rawBody)}`,
        "Bad Request",
      );

    const parsedMandateId = mandateIdSchema.safeParse(request.params.mandateId);

    if (!parsedMandateId.success)
      return malformedBodyResponse(
        `Malformed mandateId ${request.params.mandateId}`,
        "Bad Request",
      );

    try {
      await acceptNotificationMandateUseCase.execute(
        isTest,
        parsedMandateId.data,
        parsedBody.data,
        sendHeaders,
      );
      return { status: 200 };
    } catch (err) {
      if (err instanceof NotificationClientError) {
        context.error("Notification client error:", err.message);

        switch (err.status) {
          case 403:
            telemetryService.trackEvent(
              TelemetryEventName.SEND_AAR_CREATE_MANDATE_MALFORMED_403,
            );
            break;
          case 404:
            telemetryService.trackEvent(
              TelemetryEventName.SEND_AAR_CREATE_MANDATE_QRCODE_DATA_NOT_FOUND,
            );
            break;
          default:
            telemetryService.trackEvent(
              TelemetryEventName.SEND_AAR_CREATE_MANDATE_SERVER_ERROR,
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

      if (err instanceof NotificationCLientAuthError) {
        return {
          jsonBody: sendAuthErrorToAARProblemJson(err, err.status),
          status: err.status,
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
