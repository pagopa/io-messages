import {
  HttpHandler,
  HttpRequest,
  HttpResponse,
  InvocationContext,
} from "@azure/functions";
import NotificationClient from "../send/notification.js";

export const getNotification =
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
      const iun = request.params.iun;

      const client = isTest ? uatNotificationClient : notificationClient;
      const mandateId = request.query.has("mandateId")
        ? request.query.get("mandateId")!
        : undefined;
      await client.getReceivedNotification(iun, {}, mandateId);

      return new HttpResponse({ status: 200 });
    } catch (err) {
      return new HttpResponse({ status: 500 });
    }
  };
