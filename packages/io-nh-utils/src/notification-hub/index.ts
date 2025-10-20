import {
  Installation,
  NotificationHubsClient,
  RegistrationDescription,
} from "@azure/notification-hubs";
import "dotenv/config";

import { APNSPushType, APNSTemplate, FCMV1Template, SasParams } from "./types";

export const deleteInstallation = async (
  client: NotificationHubsClient,
  installationId: string,
) => {
  try {
    await client.deleteInstallation(installationId);
  } catch (error) {
    throw new Error(
      `Error deleting installation ${installationId}: ${error.message}`,
    );
  }
};

export const createInstallation = async (
  client: NotificationHubsClient,
  installation: Installation,
) => {
  try {
    await client.createOrUpdateInstallation(installation);
  } catch (error) {
    throw new Error(
      `Error creating installation ${installation.installationId}: ${error.message}`,
    );
  }
};

export const getInstallation = async (
  client: NotificationHubsClient,
  installationId: string,
): Promise<Installation | undefined> => {
  try {
    const installation = await client.getInstallation(installationId);
    return installation;
  } catch (error) {
    throw new Error(
      `Error fetching installation ${installationId}: ${error.message}`,
    );
  }
};

export const migrateInstallation = async (
  fromClient: NotificationHubsClient,
  toClient: NotificationHubsClient,
  installationId: string,
) => {
  const installation = await getInstallation(fromClient, installationId);
  if (installation) {
    // create a new installation following apps/pushnotif-func/src/utils/notification.ts 's createOrUpdateInstallation
    const newInstallation: Installation = {
      ...installation,
      templates: {
        template: {
          body:
            installation.platform.toLowerCase() === "apns"
              ? APNSTemplate
              : FCMV1Template,
          headers:
            installation.platform.toLowerCase() === "apns"
              ? {
                  ["apns-priority"]: "10",
                  ["apns-push-type"]: APNSPushType.ALERT,
                }
              : {},
          // add the installation id as a tag (pushnotif-func receives it from io-backend's request)
          tags: [installation.installationId],
        },
      },
    };
    await createInstallation(toClient, newInstallation);
  }
};

export const importInstallation = async (
  toClient: NotificationHubsClient,
  installationId: string,
  platform: string,
) => {
  // create a new installation following apps/pushnotif-func/src/utils/notification.ts 's createOrUpdateInstallation
  const newInstallation = {
    templates: {
      template: {
        body: platform.toLowerCase() === "apns" ? APNSTemplate : FCMV1Template,
        headers:
          platform.toLowerCase() === "apns"
            ? {
                ["apns-priority"]: "10",
                ["apns-push-type"]: APNSPushType.ALERT,
              }
            : {},
        // add the installation id as a tag (pushnotif-func receives it from io-backend's request)
        tags: [installationId],
      },
    },
  } as unknown as Installation;
  await createInstallation(toClient, newInstallation);
};

export const getPager = (
  client: NotificationHubsClient,
  pageSize: number,
): AsyncIterableIterator<RegistrationDescription[]> => {
  const pager = client.listRegistrations({ top: pageSize }).byPage();

  return pager;
};
