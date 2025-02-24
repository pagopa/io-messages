/**
 * Use a singleton CosmosDB client across functions.
 */
import { CosmosClient } from "@azure/cosmos";
import { getConfigOrThrow } from "../utils/config";
import { DefaultAzureCredential } from "@azure/identity";

const config = getConfigOrThrow();

const aadCredentials = new DefaultAzureCredential();

// Setup CosmosDB
export const cosmosDbUri = config.COSMOSDB_URI;
export const cosmosDbName = config.COSMOSDB_NAME;

export const cosmosdbClient = new CosmosClient({
  endpoint: cosmosDbUri,
  aadCredentials,
});

export const cosmosdbInstance = cosmosdbClient.database(cosmosDbName);

// setup cosmosdb for RC
export const remoteContentCosmosDbUri = config.REMOTE_CONTENT_COSMOSDB_URI;
export const remoteContentCosmosDbName = config.REMOTE_CONTENT_COSMOSDB_NAME;

export const remoteContentCosmosDbClient = new CosmosClient({
  endpoint: remoteContentCosmosDbUri,
  aadCredentials,
});

export const remoteContentCosmosDbInstance =
  remoteContentCosmosDbClient.database(remoteContentCosmosDbName);
