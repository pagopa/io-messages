import { CosmosClient } from "@azure/cosmos";
import { CosmosMetadataLoader } from "./adapters/cosmos/metadata-loader.js";
import { LoadFixturesUseCase } from "./domain/use-cases/load-fixtures.js";
import { DefaultAzureCredential } from "@azure/identity";
import { BlobContentLoader } from "./adapters/blob/content-loader.js";
import { BlobServiceClient } from "@azure/storage-blob";
import { pino } from "pino";
import { loadConfigFromEnvironment } from "io-messages-common/adapters/config";
import { Config, configSchema } from "./adapters/config.js";

const azureCredentials = new DefaultAzureCredential();

const main = async (config: Config) => {
  const messageContainerClient = new CosmosClient({
    aadCredentials: azureCredentials,
    endpoint: config.COSMOS_URI,
  })
    .database(config.COSMOS_DATABASE_NAME)
    .container(config.COSMOS_MESSAGE_CONTAINER_NAME);

  const contentContainerClient = new BlobServiceClient(
    config.COMMON_STORAGE_ACCOUNT_URI,
    azureCredentials,
  ).getContainerClient(config.COMMON_STORAGE_ACCOUNT_MESSAGE_CONTAINER_NAME);

  const metadataLoader = new CosmosMetadataLoader(messageContainerClient);
  const contentLoader = new BlobContentLoader(contentContainerClient);

  const loadFixturesUseCase = new LoadFixturesUseCase(
    metadataLoader,
    contentLoader,
    pino(),
  );

  await loadFixturesUseCase.execute(3, {
    includeRemoteContents: config.INCLUDE_REMOTE_CONTENT,
    includePayments: config.INCLUDE_PAYMENTS,
  });
};

await loadConfigFromEnvironment(main, configSchema);
