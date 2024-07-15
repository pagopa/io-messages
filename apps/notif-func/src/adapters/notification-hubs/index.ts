import { RestError } from "@azure/core-rest-pipeline";
import {
  FcmLegacyInstallation,
  Installation,
  NotificationHubsClient,
} from "@azure/notification-hubs";
import * as assert from "node:assert/strict";

import { NotificationHubsConfig } from "./config.js";

export type NotificationHubsClientFactory = (
  hubName: string,
) => NotificationHubsClient;

export const createNotificationHubClientFactory = (
  config: NotificationHubsConfig,
): NotificationHubsClientFactory => {
  const clients = new Map<string, NotificationHubsClient>();
  return (hubName) => {
    if (clients.has(hubName)) {
      const client = clients.get(hubName);
      assert.ok(typeof client !== "undefined");
      return client;
    }
    const hub = config.hubs.get(hubName);
    assert.ok(typeof hub !== "undefined", `Can't find ${hubName} credentials`);
    const client = new NotificationHubsClient(hub.connectionString, hubName);
    clients.set(hubName, client);
    return client;
  };
};

function isFcmLegacyInstallation(i: Installation): i is FcmLegacyInstallation {
  const platform: string = i.platform;
  return platform === "gcm" || platform === "Gcm";
}

/*
 * In order to migrate an installation from gcm to fcmV1 we need to update the
 * platform and the template
 * */
export const migrateGcmInstallationToFcmV1 = async (
  installationId: string,
  nhClient: NotificationHubsClient,
): Promise<void> => {
  try {
    const installation = await nhClient.getInstallation(installationId);
    const fcmV1TemplateBody =
      '{"message": {"notification": {"title": "$(title)", "body": "$(message)"}, "android": {"data": {"message_id": "$(message_id)"}, "notification": {"icon": "ic_notification"}}}}';
    if (isFcmLegacyInstallation(installation)) {
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
    }
  } catch (err) {
    // if we can't find the installation we just want to throw
    if (err instanceof RestError && err.statusCode === 404) {
      return;
    }
    throw err;
  }
};
