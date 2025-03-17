import { CosmosClient } from "@azure/cosmos";
import { BlobServiceClient } from "@azure/storage-blob";
import { pino } from "pino";
import { app } from "@azure/functions";

import { BlobMessageContentDeleter } from "./adapters/blob-storage/message-content-deleter.js";
import { envSchema } from "./adapters/config.js";
import { CosmosMessageMetadataDeleter } from "./adapters/cosmos/message-metadata-deleter.js";
import { CosmosMessageStatusDeleter } from "./adapters/cosmos/message-status-deleter.js";
import { DeleteMessageUseCase } from "./domain/use-cases/delete-message.js";
import { deleteMessages } from "./adapters/functions/delete-messages.js";
import { DefaultAzureCredential } from "@azure/identity";

const main = async () => {
  const config = envSchema.parse(process.env);
  const logger = pino();

  const azureCredentials = new DefaultAzureCredential();

  const client = new CosmosClient({
    aadCredentials: azureCredentials,
    endpoint: config.COSMOS_URI,
  });
  const database = client.database(config.COSMOS_DATABASE_NAME);

  const messagesContainer = database.container("messages");
  const messageStatusContainer = database.container("message-status");

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

  const deleteMessageUseCase = new DeleteMessageUseCase(
    logger,
    messageContentDeleter,
    messageMetadataDeleter,
    messageStatusDeleter,
  );

  app.http("Health", {
    authLevel: "anonymous",
    handler: () => ({
      body: "it works!",
    }),
    methods: ["GET"],
    route: "health",
  });

  app.storageBlob("DeleteMessages", {
    connection: "",
    handler: deleteMessages(deleteMessageUseCase),
    path: config.STORAGE_ACCOUNT_DELETE_MESSAGES_PATH,
  });
};

main();
