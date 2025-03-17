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

  const messagesContainer = cosmosDatabase.container("messages");
  const messageStatusContainer = cosmosDatabase.container("message-status");

  const messageMetadataDeleter = new CosmosMessageMetadataDeleter(
    messagesContainer,
    logger,
  );

  const messageStatusDeleter = new CosmosMessageStatusDeleter(
    messageStatusContainer,
    logger,
  );

  const contentServiceClient = new BlobServiceClient(
    config.COMMON_STORAGE_ACCOUNT_URL,
    azureCredentials,
  );

  const containerClient = contentServiceClient.getContainerClient("messages");

  const messageContentDeleter = new BlobMessageContentDeleter(
    containerClient,
    logger,
  );

  const healthcheckUseCase = new HealthUseCase(
    cosmosDatabase,
    containerClient,
    logger,
  );

  const deleteMessageUseCase = new DeleteMessageUseCase(
    logger,
    messageContentDeleter,
    messageMetadataDeleter,
    messageStatusDeleter,
  );

  app.http("Health", {
    authLevel: "anonymous",
    handler: healthcheck(healthcheckUseCase),
    methods: ["GET"],
    route: "health",
  });

  app.storageBlob("DeleteMessages", {
    connection: "COM_STORAGE_ACCOUNT",
    handler: deleteMessages(deleteMessageUseCase),
    path: config.STORAGE_ACCOUNT_DELETE_MESSAGES_PATH,
  });
};

main();
