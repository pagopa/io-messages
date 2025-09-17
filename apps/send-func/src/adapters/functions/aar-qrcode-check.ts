import {
  HttpHandler,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import NotificationClient, {
  NotificationClientError,
} from "../send/notification.js";
import {
  checkQrMandateRequestSchema,
  problemJsonSchema,
} from "../send/definitions.js";

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

      const rawBody = await request.json();
      const parsedBody = checkQrMandateRequestSchema.parse(rawBody);

      const client = isTest ? uatNotificationClient : notificationClient;
      const response = await client.checkAarQrCodeIO(parsedBody, {});
      return { status: 200, jsonBody: response };
    } catch (err) {
      if (err instanceof Error && err.name === "ZodError") {
        context.error("aarQRCodeCheck malformed request:", err);
        return {
          status: 400,
          jsonBody: {
            type: "",
            status: 400,
            errors: [
              {
                code: "Malformed request",
                detail: JSON.stringify(err.message),
              },
            ],
          },
        };
      }

      if (
        err instanceof NotificationClientError &&
        err.name === "NotificationClientError"
      ) {
        context.error("aarQRCodeCheck send error:", err);
        return {
          status: 500,
          jsonBody: {
            type: "",
            status: err.status,
            errors: [
              {
                code: "Internal server error",
                detail: JSON.stringify(err.body),
              },
            ],
          },
        };
      }

      context.error("aarQRCodeCheck internal server error:", err);
      return {
        status: 500,
        jsonBody: {
          type: "",
          status: 500,
          errors: [{ code: "Internal server error" }],
        },
      };
    }
  };
