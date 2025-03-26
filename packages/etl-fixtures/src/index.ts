import { CosmosClient } from "@azure/cosmos";
import { DefaultAzureCredential } from "@azure/identity";
import { BlobServiceClient } from "@azure/storage-blob";
import { loadConfigFromEnvironment } from "io-messages-common/adapters/config";
import { pino } from "pino";

import { BlobContentLoader } from "./adapters/blob/content-loader.js";
import { Config, configSchema, validateArguments } from "./adapters/config.js";
import { CosmosMetadataLoader } from "./adapters/cosmos/metadata-loader.js";
import { LoadFixturesUseCase } from "./domain/use-cases/load-fixtures.js";
import { TableServiceClient } from "@azure/data-tables";

const azureCredentials = new DefaultAzureCredential();

const main = async (config: Config) => {
  const { fixturesNumber } = validateArguments(process.argv);

  const messageContainerClient = new CosmosClient({
    aadCredentials: azureCredentials,
    endpoint: config.COSMOS_URI,
  })
    .database(config.COSMOS_DATABASE_NAME)
    .container(config.COSMOS_MESSAGE_CONTAINER_NAME);

  const blobServiceClient = BlobServiceClient.fromConnectionString(
    config.COMMON_STORAGE_ACCOUNT_CONN_STRING,
  );

  await blobServiceClient
    .getContainerClient(config.COMMON_STORAGE_ACCOUNT_MESSAGE_CONTAINER_NAME)
    .createIfNotExists();

  const tableServiceClient = TableServiceClient.fromConnectionString(
    config.COMMON_STORAGE_ACCOUNT_CONN_STRING,
    { allowInsecureConnection: true },
  );

  await tableServiceClient.createTable(config.MESSAGE_ERROR_TABLE_STORAGE_NAME);

  const contentContainerClient = blobServiceClient.getContainerClient(
    config.COMMON_STORAGE_ACCOUNT_MESSAGE_CONTAINER_NAME,
  );

  const metadataLoader = new CosmosMetadataLoader(messageContainerClient);
  const contentLoader = new BlobContentLoader(contentContainerClient);

  const loadFixturesUseCase = new LoadFixturesUseCase(
    metadataLoader,
    contentLoader,
    pino(),
  );

  await loadFixturesUseCase.execute(fixturesNumber, {
    includePayments: config.INCLUDE_PAYMENTS,
    includeRemoteContents: config.INCLUDE_REMOTE_CONTENT,
  });
};

await loadConfigFromEnvironment(main, configSchema);
