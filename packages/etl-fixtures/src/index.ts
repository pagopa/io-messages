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
import { readFileSync, existsSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const etlFunctionPath = resolve(
  __dirname,
  "../../../apps/etl-func/local.settings.json",
);

const azureCredentials = new DefaultAzureCredential();

if (existsSync(etlFunctionPath)) {
  const settings = JSON.parse(readFileSync(etlFunctionPath, "utf8")).Values;
  Object.keys(settings).forEach((key) => {
    process.env[key] = settings[key];
  });
} else {
  throw new Error("ETL function not found");
}

const main = async (config: Config) => {
  const { fixturesNumber } = validateArguments(process.argv);

  const messageContainerClient = new CosmosClient({
    aadCredentials: azureCredentials,
    endpoint: config.COMMON_COSMOS__accountEndpoint,
  })
    .database(config.COMMON_COSMOS_DBNAME)
    .container(config.COMMON_COSMOS_MESSAGES_CONTAINER_NAME);

  const blobServiceClient = BlobServiceClient.fromConnectionString(
    config.MESSAGE_CONTENT_STORAGE_CONNECTION_STRING,
  );

  await blobServiceClient
    .getContainerClient(config.MESSAGE_CONTENT_CONTAINER_NAME)
    .createIfNotExists();

  const tableServiceClient = TableServiceClient.fromConnectionString(
    config.MESSAGE_CONTENT_STORAGE_CONNECTION_STRING,
    { allowInsecureConnection: true },
  );

  await tableServiceClient.createTable(config.MESSAGE_ERROR_TABLE_STORAGE_NAME);

  const contentContainerClient = blobServiceClient.getContainerClient(
    config.MESSAGE_CONTENT_CONTAINER_NAME,
  );

  const metadataLoader = new CosmosMetadataLoader(messageContainerClient);
  const contentLoader = new BlobContentLoader(contentContainerClient);

  const loadFixturesUseCase = new LoadFixturesUseCase(
    metadataLoader,
    contentLoader,
    pino(),
  );

  await loadFixturesUseCase.execute(fixturesNumber, {
    includePayments: config.FIXTURES_INCLUDE_PAYMENTS,
    includeRemoteContents: config.FIXTURES_INCLUDE_REMOTE_CONTENT,
  });
};

await loadConfigFromEnvironment(main, configSchema);
