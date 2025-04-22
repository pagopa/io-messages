/**
 * Use a singleton CosmosDB client across functions.
 */
import { CosmosClient } from "@azure/cosmos";
import { DefaultAzureCredential } from "@azure/identity";

import { getConfigOrThrow } from "../utils/config";

const config = getConfigOrThrow();

const aadCredentials = new DefaultAzureCredential();

// Setup DocumentDB
export const cosmosDbUri = config.COSMOSDB_URI;
export const cosmosDbName = config.COSMOSDB_NAME;

export const cosmosdbClient = new CosmosClient({
  aadCredentials,
  endpoint: cosmosDbUri,
});

export const cosmosdbInstance = cosmosdbClient.database(cosmosDbName);

// Setup remote content cosmosdb
export const remoteContentCosmosDbUri = config.REMOTE_CONTENT_COSMOSDB_URI;
export const remoteContentCosmosDbName = config.REMOTE_CONTENT_COSMOSDB_NAME;

export const remoteContentCosmosdbClient = new CosmosClient({
  aadCredentials,
  endpoint: remoteContentCosmosDbUri,
});

export const remoteContentCosmosdbInstance =
  remoteContentCosmosdbClient.database(remoteContentCosmosDbName);
