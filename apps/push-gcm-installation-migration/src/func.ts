import { app } from "@azure/functions";

import { Config, loadConfigFromEnvironment } from "./adapters/config.js";
import health from "./adapters/functions/health.js";
import migrateGcmToFcmV1 from "./adapters/functions/migrate-gcm-to-fcm.js";
import { createNotificationHubClientFactory } from "./adapters/notification-hubs/index.js";

async function main(config: Config) {
  app.http("Health", health());

  const nhClientFactory = createNotificationHubClientFactory(
    config.notificationHubs,
  );

  app.storageBlob(
    "MigrateGcmToFcmV1",
    migrateGcmToFcmV1(config.storage.gcmMigrationInput, nhClientFactory),
  );
}

await loadConfigFromEnvironment(main);
