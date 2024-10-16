import { app, output } from "@azure/functions";
import { TelemetryClient } from "applicationinsights";
import { loadConfigFromEnvironment } from "io-messages-common/adapters/config";

import { Config, configFromEnvironment } from "./adapters/config.js";
import migrateGcmToFcmV1 from "./adapters/functions/migrate-gcm-to-fcm.js";
import splitInstallationChunks from "./adapters/functions/split-installation-chunks.js";
import { createNotificationHubClientFactory } from "./adapters/notification-hubs/index.js";

async function main(config: Config) {
  const telemetryClient = new TelemetryClient(
    config.appInsights.connectionString,
  );

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
    handler: splitInstallationChunks(queueOutput, telemetryClient),
    path: config.storage.gcmMigrationInput.path,
  });

  app.storageQueue("MigrateGcmToFcmV1", {
    connection,
    handler: migrateGcmToFcmV1(nhClientFactory, telemetryClient),
    queueName,
  });
}

await loadConfigFromEnvironment(main, configFromEnvironment);
