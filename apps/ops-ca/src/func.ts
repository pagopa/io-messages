import { CosmosClient } from "@azure/cosmos";
import { app } from "@azure/functions";
import { DefaultAzureCredential } from "@azure/identity";
import { BlobServiceClient } from "@azure/storage-blob";
import { pino } from "pino";

import { BlobMessageContentDeleter } from "./adapters/blob-storage/message-content-deleter.js";
import { envSchema } from "./adapters/config.js";
import { CosmosMessageMetadataDeleter } from "./adapters/cosmos/message-metadata-deleter.js";
import { CosmosMessageStatusDeleter } from "./adapters/cosmos/message-status-deleter.js";
import { deleteMessages } from "./adapters/functions/delete-messages.js";
import { healthcheck } from "./adapters/functions/health.js";
import { DeleteMessageUseCase } from "./domain/use-cases/delete-message.js";
import { HealthUseCase } from "./domain/use-cases/health.js";

const main = async () => {
  const config = envSchema.parse(process.env);
  const logger = pino();

  const azureCredentials = new DefaultAzureCredential();

  const cosmosClient = new CosmosClient({
    aadCredentials: azureCredentials,
    endpoint: config.COSMOS_URI,
  });
  const cosmosDatabase = cosmosClient.database(config.COSMOS_DATABASE_NAME);

  const messageMetadata = cosmosDatabase.container("messages");
  const messageStatus = cosmosDatabase.container("message-status");

  const messageMetadataDeleter = new CosmosMessageMetadataDeleter(
    messageMetadata,
    logger,
  );

  const messageStatusDeleter = new CosmosMessageStatusDeleter(
    messageStatus,
    logger,
  );

  const contentServiceClient = new BlobServiceClient(
    config.COMMON_STORAGE_ACCOUNT_URL,
    azureCredentials,
  );

  const messageContent = contentServiceClient.getContainerClient("messages");

  const comBlobServiceClient = new BlobServiceClient(
    config.STORAGE_ACCOUNT__serviceUri,
    azureCredentials,
  );

  const deletedMessagesLogs = comBlobServiceClient.getContainerClient(
    "deleted-messages-logs",
  );

  const messageContentDeleter = new BlobMessageContentDeleter(
    messageContent,
    logger,
  );

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

  app.http("Health", {
    authLevel: "anonymous",
    handler: healthcheck(healthcheckUseCase),
    methods: ["GET"],
    route: "health",
  });

  app.storageBlob("DeleteMessages", {
    connection: "STORAGE_ACCOUNT",
    handler: deleteMessages(deleteMessageUseCase),
    path: "delete-messages/{name}",
  });
};

main();
