import { NotificationHubClients } from "@/domain/notification-hub.js";
import { RestError } from "@azure/core-rest-pipeline";
import {
  FcmLegacyInstallation,
  NotificationHubsClient,
} from "@azure/notification-hubs";

const fcmV1TemplateBody =
  '{"message": {"notification": {"title": "$(title)", "body": "$(message)"}, "android": {"data": {"message_id": "$(message_id)"}, "notification": {"icon": "ic_notification"}}}}';

/*
 * In order to migrate an installation from gcm to fcmV1 we need to update the
 * platform and the template
 * */

const updateGcmInstallation = async (
  installation: FcmLegacyInstallation,
  nhClient: NotificationHubsClient,
) =>
  await nhClient.createOrUpdateInstallation({
    ...installation,
    platform: "fcmv1",
    templates: {
      template: {
        body: fcmV1TemplateBody,
        headers: {},
        tags: [installation.installationId, "template"],
      },
    },
  });

/*
 * Return the correct partition of the notification-hub
 * */

export const nhPartitionSelector = (
  nhClients: NotificationHubClients,
  installationId: string,
): Error | NotificationHubsClient => {
  switch (installationId.charAt(0).toLowerCase()) {
    case "0":
    case "1":
    case "2":
    case "3":
      return nhClients.nhClientPartition1;
    case "4":
    case "5":
    case "6":
    case "7":
      return nhClients.nhClientPartition2;
    case "8":
    case "9":
    case "a":
    case "b":
      return nhClients.nhClientPartition3;
    case "c":
    case "d":
    case "e":
    case "f":
      return nhClients.nhClientPartition4;
    default:
      return new Error("Invalid installationId");
  }
};

export const migrateGcmInstallationToFcmV1 = async (
  installationId: string,
  nhClients: NotificationHubClients,
): Promise<void> => {
  const nhClient = nhPartitionSelector(nhClients, installationId);

  // The installationId is invalid, we just want to skip
  if (nhClient instanceof Error) return;

  try {
    const installation = await nhClient.getInstallation(installationId);
    if (installation.platform === "gcm")
      await updateGcmInstallation(installation, nhClient);
  } catch (error) {
    // if we can't find the installation we just want to throw
    if (error instanceof RestError && error.statusCode === 404) return;
    throw new Error(JSON.stringify(error));
  }
};
