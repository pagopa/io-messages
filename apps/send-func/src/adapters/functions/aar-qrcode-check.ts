import {
  HttpHandler,
  HttpRequest,
  HttpResponse,
  InvocationContext,
} from "@azure/functions";
import NotificationClient from "../send/notification.js";
import { checkQrMandateRequestSchema } from "../send/definitions.js";

export const aarQRCodeCheck =
  (
    notificationClient: NotificationClient,
    uatNotificationClient: NotificationClient,
  ): HttpHandler =>
  async (
    request: HttpRequest,
    context: InvocationContext,
  ): Promise<HttpResponse> => {
    try {
      const isTest = request.query.get("isTest") === "true";

      const rawBody = await request.json();
      const parsedBody = checkQrMandateRequestSchema.parse(rawBody);

      const client = isTest ? uatNotificationClient : notificationClient;
      await client.checkAarQrCodeIO(parsedBody, {});

      return new HttpResponse({ status: 200 });
    } catch (err) {
      context.error("Errore in aarQRCodeCheck:", err);

      if (err instanceof Error && err.name === "ZodError") {
        return new HttpResponse({ status: 400 });
      }

      return new HttpResponse({ status: 500 });
    }
  };
