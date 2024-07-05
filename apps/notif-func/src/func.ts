import { app } from "@azure/functions";

import { Config, loadConfigFromEnvironment } from "./adapters/config.js";
import migrateGcmToFcmV1 from "./adapters/functions/migrate-gcm-to-fcm.js";
import { createNotificationHubClientFactory } from "./adapters/notification-hubs/index.js";

async function main(config: Config) {
  app.http("Health", {
    authLevel: "anonymous",
    handler: () => ({
      body: "it works!",
    }),
    methods: ["GET"],
    route: "health",
  });

  const nhClientFactory = createNotificationHubClientFactory(
    config.notificationHubs,
  );

  app.storageBlob("MigrateGcmToFcmV1", {
    connection: config.storage.gcmMigrationInput.connection,
    handler: migrateGcmToFcmV1(nhClientFactory),
    path: config.storage.gcmMigrationInput.path,
  });
}

await loadConfigFromEnvironment(main);
