import { NotificationHubsClient } from "@azure/notification-hubs";
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
    assert.ok(typeof hub !== "undefined");
    const client = new NotificationHubsClient(hub.connectionString, hubName);
    clients.set(hubName, client);
    return client;
  };
};
