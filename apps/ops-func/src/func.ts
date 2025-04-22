import { CosmosClient } from "@azure/cosmos";
import { app, output } from "@azure/functions";
import { DefaultAzureCredential } from "@azure/identity";
import { BlobServiceClient } from "@azure/storage-blob";
import { loadConfigFromEnvironment } from "io-messages-common/adapters/config";

import { BlobStorageAuditLogger } from "./adapters/audit.js";
import { Config, configFromEnvironment } from "./adapters/config.js";
import { deleteMessage } from "./adapters/functions/delete-message.js";
import { healthcheck } from "./adapters/functions/health.js";
import { splitDeleteMessages } from "./adapters/functions/split-delete-messages.js";
import { MessageRepositoryAdapter } from "./adapters/message.js";
import { DeleteMessageUseCase } from "./domain/use-cases/delete-message.js";
import { HealthUseCase } from "./domain/use-cases/health.js";

const main = async (config: Config): Promise<void> => {
  const azureCredentials = new DefaultAzureCredential();

  const cosmosClient = new CosmosClient({
    aadCredentials: azureCredentials,
    endpoint: config.commonCosmos.uri,
  });

  const db = cosmosClient.database(config.commonCosmos.databaseName);

  const messageStorage = new BlobServiceClient(
    config.commonStorageAccount.url,
    azureCredentials,
  );

  const storage = new BlobServiceClient(
    config.storageAccount.blobUrl,
    azureCredentials,
  );

  const healthcheckUseCase = new HealthUseCase(db);

  const repo = new MessageRepositoryAdapter(db, storage);
  const auditLogger = new BlobStorageAuditLogger(messageStorage);

  const queueOutput = output.storageQueue({
    connection: "STORAGE_ACCOUNT",
    queueName: "delete-messages",
  });

  app.http("Health", {
    authLevel: "anonymous",
    handler: healthcheck(healthcheckUseCase),
    methods: ["GET"],
    route: "health",
  });

  app.storageBlob("SplitDeleteMessageChunks", {
    connection: "STORAGE_ACCOUNT",
    extraOutputs: [queueOutput],
    handler: splitDeleteMessages(queueOutput),
    path: "operations/delete-messages/{name}",
  });

  app.storageQueue("DeleteMessages", {
    connection: "STORAGE_ACCOUNT",
    handler: deleteMessage(new DeleteMessageUseCase(repo, auditLogger)),
    queueName: "delete-messages",
  });
};

await loadConfigFromEnvironment(main, configFromEnvironment);
