import { NotificationHubsClient } from "@azure/notification-hubs";

import { ErrorInternal } from "../../domain/error";

export const notificationHubHealthcheck = async (
  client: NotificationHubsClient,
  index: number,
): Promise<ErrorInternal | undefined> => {
  try {
    await client.listRegistrations({ top: 1 }).next();
  } catch (err) {
    return new ErrorInternal(
      `Healthcheck failed for notification hub ${index}`,
      err,
    );
  }
};
