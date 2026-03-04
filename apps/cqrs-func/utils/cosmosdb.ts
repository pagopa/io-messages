/**
 * Use a singleton CosmosDB client across functions.
 */
import { CosmosClient } from "@azure/cosmos";
import { DefaultAzureCredential } from "@azure/identity";

import { getConfigOrThrow } from "./config";

const azureCredentials = new DefaultAzureCredential();

const config = getConfigOrThrow();
const cosmosDbUri = config.COSMOSDB__accountEndpoint;
const cosmosDbName = config.COSMOSDB_NAME;

export const cosmosdbClient = new CosmosClient({
  aadCredentials: azureCredentials,
  endpoint: cosmosDbUri,
});

export const cosmosdbInstance = cosmosdbClient.database(cosmosDbName);
