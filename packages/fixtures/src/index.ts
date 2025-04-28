import { CosmosClient } from "@azure/cosmos";
import { TableServiceClient } from "@azure/data-tables";
import { BlobServiceClient } from "@azure/storage-blob";
import { pino } from "pino";

import { LoadFixturesOptions } from "./adapters/config.js";
import { MessageRepositoryAdapter } from "./adapters/message.js";
import { MessageGeneratorRepositoryAdapter } from "./adapters/message-generator.js";
import { LoadFixturesUseCase } from "./domain/use-cases/load-fixtures.js";

export const loadFixtures = async (
  count: number,
  options: LoadFixturesOptions,
) => {
  const metadataContainerClient = new CosmosClient({
    aadCredentials: options.aadCredentials,
    endpoint: options.cosmosEndpoint,
  })
    .database(options.cosmosDatabaseName)
    .container(options.storageMessageContentContainerName);

  const blobServiceClient = BlobServiceClient.fromConnectionString(
    options.storageConnectionString,
  );

  await blobServiceClient
    .getContainerClient(options.storageMessageContentContainerName)
    .createIfNotExists();

  const tableServiceClient = TableServiceClient.fromConnectionString(
    options.storageConnectionString,
    { allowInsecureConnection: true },
  );

  await tableServiceClient.createTable("MessagesDataplanIngestionErrors");

  const contentContainerClient = blobServiceClient.getContainerClient(
    options.storageMessageContentContainerName,
  );

  const loadFixturesUseCase = new LoadFixturesUseCase(
    new MessageGeneratorRepositoryAdapter(),
    new MessageRepositoryAdapter(
      metadataContainerClient,
      contentContainerClient,
    ),
    pino(),
  );

  await loadFixturesUseCase.execute(count, {
    includePayments: options?.includePayments ? true : false,
    includeRemoteContents: options?.includeRemoteContents ? true : false,
  });
};
