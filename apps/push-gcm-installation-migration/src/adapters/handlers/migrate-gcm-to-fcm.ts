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

export const migrateGcmInstallationToFcmV1 = async (
  installation: FcmLegacyInstallation,
  nhClient: NotificationHubsClient,
): Promise<void> => {
  try {
    await updateGcmInstallation(installation, nhClient);
  } catch (error) {
    throw new Error(JSON.stringify(error));
  }
};
