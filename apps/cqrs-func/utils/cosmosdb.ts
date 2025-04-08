/**
 * Use a singleton CosmosDB client across functions.
 */
import { CosmosClient } from "@azure/cosmos";
import { getConfigOrThrow } from "./config";
import { DefaultAzureCredential } from "@azure/identity";

const azureCredentials = new DefaultAzureCredential();

const config = getConfigOrThrow();
const cosmosDbUri = config.COSMOSDB__accountEndpoint;
const cosmosDbName = config.COSMOSDB_NAME;

export const cosmosdbClient = new CosmosClient({
  aadCredentials: azureCredentials,
  endpoint: cosmosDbUri,
});

export const cosmosdbInstance = cosmosdbClient.database(cosmosDbName);

// setup cosmosdb for RC
export const remoteContentCosmosDbUri = config.REMOTE_CONTENT_COSMOSDB_URI;
export const remoteContentCosmosDbName = config.REMOTE_CONTENT_COSMOSDB_NAME;

export const remoteContentCosmosDbClient = new CosmosClient({
  aadCredentials: azureCredentials,
  endpoint: remoteContentCosmosDbUri
});

export const remoteContentCosmosDbInstance = remoteContentCosmosDbClient.database(
  remoteContentCosmosDbName
);
