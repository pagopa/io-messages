import { CosmosClient } from "@azure/cosmos";
import { app } from "@azure/functions";
import { DefaultAzureCredential } from "@azure/identity";
import { BlobServiceClient } from "@azure/storage-blob";
import { loadConfigFromEnvironment } from "io-messages-common/adapters/config";
import { pino } from "pino";

import { BlobMessageContentDeleter } from "./adapters/blob-storage/message-content-deleter.js";
import { Config, configFromEnvironment } from "./adapters/config.js";
import { CosmosMessageMetadataDeleter } from "./adapters/cosmos/message-metadata-deleter.js";
import { CosmosMessageStatusDeleter } from "./adapters/cosmos/message-status-deleter.js";
import { deleteMessages } from "./adapters/functions/delete-messages.js";
import { healthcheck } from "./adapters/functions/health.js";
import { DeleteMessageUseCase } from "./domain/use-cases/delete-message.js";
import { HealthUseCase } from "./domain/use-cases/health.js";
import { splitDeleteMessage } from "./adapters/functions/split-delete-messages.js";
import { QueueServiceClient } from "@azure/storage-queue";

const main = async (config: Config): Promise<void> => {
  const logger = pino();

  const azureCredentials = new DefaultAzureCredential();

  const cosmosClient = new CosmosClient({
    aadCredentials: azureCredentials,
    endpoint: config.commonCosmos.uri,
  });
  const cosmosDatabase = cosmosClient.database(
    config.commonCosmos.databaseName,
  );

  const messageMetadata = cosmosDatabase.container("messages");
  const messageStatus = cosmosDatabase.container("message-status");

  const messageMetadataDeleter = new CosmosMessageMetadataDeleter(
    messageMetadata,
  );

  const messageStatusDeleter = new CosmosMessageStatusDeleter(messageStatus);

  const contentServiceClient = new BlobServiceClient(
    config.commonStorageAccount.url,
    azureCredentials,
  );

  const messageContent = contentServiceClient.getContainerClient("messages");

  const comBlobServiceClient = new BlobServiceClient(
    config.storageAccount.blobUrl,
    azureCredentials,
  );

  const deletedMessagesLogs = comBlobServiceClient.getContainerClient(
    "deleted-messages-logs",
  );

  const messageContentDeleter = new BlobMessageContentDeleter(messageContent);

  const healthcheckUseCase = new HealthUseCase(
    cosmosDatabase,
    messageContent,
    logger,
    deletedMessagesLogs,
  );

  const deleteMessageUseCase = new DeleteMessageUseCase(
    logger,
    messageContentDeleter,
    messageMetadataDeleter,
    messageStatusDeleter,
    deletedMessagesLogs,
  );

  const queueClient = new QueueServiceClient(
    config.storageAccount.queueUrl,
    azureCredentials,
  ).getQueueClient("delete-messages");

  app.http("Health", {
    authLevel: "anonymous",
    handler: healthcheck(healthcheckUseCase),
    methods: ["GET"],
    route: "health",
  });

  app.storageBlob("SplitDeleteMessageChunks", {
    connection: "STORAGE_ACCOUNT",
    handler: splitDeleteMessage(queueClient),
    path: "delete-messages/{name}",
  });

  app.storageQueue("DeleteMessages", {
    connection: "STORAGE_ACCOUNT",
    handler: deleteMessages(deleteMessageUseCase),
    queueName: "delete-messages",
  });
};

await loadConfigFromEnvironment(main, configFromEnvironment);
