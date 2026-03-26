import { Database } from "@azure/cosmos";
import { NotificationHubsClient } from "@azure/notification-hubs";
import { BlobService } from "azure-storage";

import { ErrorInternal } from "./error";

export type HealthCheck = () => Promise<ErrorInternal | undefined>;

export const cosmosHealthcheck = async (
  db: Database,
): Promise<ErrorInternal | undefined> => {
  try {
    await db.read();
  } catch (err) {
    return new ErrorInternal(
      `Cosmos Healthcheck failed for database ${db.id}`,
      err,
    );
  }
};

export const blobServiceHealthcheck = async (
  service: BlobService,
): Promise<ErrorInternal | undefined> => {
  try {
    await new Promise((resolve, reject) => {
      service.getServiceProperties((error, _, response) => {
        if (!error && response.statusCode === 200) {
          resolve(true);
        } else {
          reject(error);
        }
      });
    });
  } catch (err) {
    return new ErrorInternal(`Healthcheck failed for storage account`, err);
  }
};

export const notificationHubHealthcheck = async (
  client: NotificationHubsClient,
): Promise<ErrorInternal | undefined> => {
  try {
    await client.deleteInstallation("test");
  } catch (err) {
    return new ErrorInternal(`Healthcheck failed for notification hub`, err);
  }
};
