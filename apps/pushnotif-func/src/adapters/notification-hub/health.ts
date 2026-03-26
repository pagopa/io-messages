import { ErrorInternal } from "../../domain/error";
import { NotificationHubsClient } from "@azure/notification-hubs";

export const notificationHubHealthcheck = async (
  client: NotificationHubsClient,
): Promise<ErrorInternal | undefined> => {
  try {
    await client.listNotificationHubJobs();
  } catch (err) {
    return new ErrorInternal(`Healthcheck failed for notification hub`, err);
  }
};
