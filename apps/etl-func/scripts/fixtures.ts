import { loadFixturesOptionsSchema } from "fixtures/adapters/config";
import { loadFixtures } from "fixtures/index";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { DefaultAzureCredential } from "@azure/identity";
import { existsSync, readFileSync } from "node:fs";
import { z } from "zod";

if (process.argv.length < 3) {
  throw new Error(
    "Please provide the number of fixtures to load as an argument",
  );
}
const fixturesToGenerate = z.number({ coerce: true }).parse(process.argv[2]);

const __dirname = dirname(fileURLToPath(import.meta.url));
const etlFunctionPath = resolve(__dirname, "../local.settings.json");

const aadCredentials = new DefaultAzureCredential();

if (existsSync(etlFunctionPath)) {
  const settings = JSON.parse(readFileSync(etlFunctionPath, "utf8")).Values;
  Object.keys(settings).forEach((key) => {
    process.env[key] = settings[key];
  });
} else {
  throw new Error("ETL function not found");
}

const options = loadFixturesOptionsSchema.parse({
  cosmosEndpoint: process.env.COMMON_COSMOS__accountEndpoint,
  cosmosDatabaseName: process.env.COMMON_COSMOS_DBNAME,
  cosmosMessageContainerName: process.env.COMMON_COSMOS_MESSAGES_CONTAINER_NAME,
  storageConnectionString:
    process.env.MESSAGE_CONTENT_STORAGE_CONNECTION_STRING,
  storageMessageContentContainerName:
    process.env.MESSAGE_CONTENT_CONTAINER_NAME,
  includePayments: process.env.FIXTURES_INCLUDE_PAYMENTS,
  includeRemoteContents: process.env.FIXTURES_INCLUDE_REMOTE_CONTENT,
});

loadFixtures(fixturesToGenerate, { ...options, aadCredentials });
