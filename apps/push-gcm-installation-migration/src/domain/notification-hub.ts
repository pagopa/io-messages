import { Config } from "@/main.js";
import { NotificationHubsClient } from "@azure/notification-hubs";

export interface NotificationHubClients {
  nhClientPartition1: NotificationHubsClient;
  nhClientPartition2: NotificationHubsClient;
  nhClientPartition3: NotificationHubsClient;
  nhClientPartition4: NotificationHubsClient;
}

export const buildNHClients = (config: Config): NotificationHubClients => ({
  nhClientPartition1: new NotificationHubsClient(
    config.notificationHub.partition1.connectionString,
    config.notificationHub.partition1.name,
  ),
  nhClientPartition2: new NotificationHubsClient(
    config.notificationHub.partition2.connectionString,
    config.notificationHub.partition2.name,
  ),
  nhClientPartition3: new NotificationHubsClient(
    config.notificationHub.partition3.connectionString,
    config.notificationHub.partition3.name,
  ),
  nhClientPartition4: new NotificationHubsClient(
    config.notificationHub.partition4.connectionString,
    config.notificationHub.partition4.name,
  ),
});
