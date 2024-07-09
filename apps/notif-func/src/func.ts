import { app, output } from "@azure/functions";
import * as appInsights from "applicationinsights";

import { Config, loadConfigFromEnvironment } from "./adapters/config.js";
import migrateGcmToFcmV1 from "./adapters/functions/migrate-gcm-to-fcm.js";
import splitInstallationChunks from "./adapters/functions/split-installation-chunks.js";
import { createNotificationHubClientFactory } from "./adapters/notification-hubs/index.js";

async function main(config: Config) {
  appInsights.setup();
  appInsights.start();

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

  const connection = config.storage.gcmMigrationInput.connection;
  const queueName = config.storage.gcmMigrationInput.queueName;

  const queueOutput = output.storageQueue({
    connection,
    queueName,
  });

  app.storageBlob("SplitInstallationChunks", {
    connection,
    extraOutputs: [queueOutput],
    handler: splitInstallationChunks(queueOutput, appInsights.defaultClient),
    path: config.storage.gcmMigrationInput.path,
  });

  app.storageQueue("MigrateGcmToFcmV1", {
    connection,
    handler: migrateGcmToFcmV1(nhClientFactory, appInsights.defaultClient),
    queueName,
  });
}

await loadConfigFromEnvironment(main);
