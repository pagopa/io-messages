import { CosmosClient } from "@azure/cosmos";
import { TableServiceClient } from "@azure/data-tables";
import { BlobServiceClient } from "@azure/storage-blob";
import { pino } from "pino";

import { BlobContentLoader } from "./adapters/blob/content-loader.js";
import { LoadFixturesOptions } from "./adapters/config.js";
import { CosmosMetadataLoader } from "./adapters/cosmos/metadata-loader.js";
import { LoadFixturesUseCase } from "./domain/use-cases/load-fixtures.js";

export const loadFixtures = async (
  count: number,
  options: LoadFixturesOptions,
) => {
  const messageContainerClient = new CosmosClient({
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

  const metadataLoader = new CosmosMetadataLoader(messageContainerClient);
  const contentLoader = new BlobContentLoader(contentContainerClient);

  const loadFixturesUseCase = new LoadFixturesUseCase(
    metadataLoader,
    contentLoader,
    pino(),
  );

  await loadFixturesUseCase.execute(count, {
    includePayments: options?.includePayments ? true : false,
    includeRemoteContents: options?.includeRemoteContents ? true : false,
  });
};
