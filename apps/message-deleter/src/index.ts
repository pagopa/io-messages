import { CosmosClient } from "@azure/cosmos";
import { BlobServiceClient } from "@azure/storage-blob";
import { config as dotenvConfig } from "dotenv";
import { pino } from "pino";

import { BlobMessageContentDeleter } from "./adapters/blob-storage/message-content-deleter.js";
import { envSchema } from "./adapters/config.js";
import { CosmosMessageMetadataDeleter } from "./adapters/cosmos/message-metadata-deleter.js";
import { CosmosMessageStatusDeleter } from "./adapters/cosmos/message-status-deleter.js";
import { DeleteMessageUseCase } from "./domain/use-cases/delete-message.js";

dotenvConfig();

const main = async () => {
  const config = envSchema.parse(process.env);
  const logger = pino();

  const client = new CosmosClient({
    endpoint: config.COSMOS_URI,
    key: config.COSMOS_KEY,
  });
  const database = client.database("io-messages");

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

  const contentServiceClient = BlobServiceClient.fromConnectionString(
    config.STORAGE_ACCOUNT_CONNECTION_STRING,
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

  await deleteMessageUseCase.execute("fakeFiscalCode", "fakeMessageId");
};

main();
