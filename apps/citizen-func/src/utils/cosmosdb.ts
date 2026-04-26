/**
 * Use a singleton CosmosDB client across functions.
 */
import { CosmosClient } from "@azure/cosmos";
import { DefaultAzureCredential } from "@azure/identity";

import { getConfigOrThrow } from "../utils/config";

const config = getConfigOrThrow();

// Setup DocumentDB
export const cosmosDbUri = config.COSMOSDB_URI;
export const cosmosDbName = config.COSMOSDB_NAME;

// When COSMOSDB_KEY is present (local emulator scenarios), use key-based auth.
// Otherwise fall back to DefaultAzureCredential for managed-identity / AAD auth.
export const cosmosdbClient = config.COSMOSDB_KEY
  ? new CosmosClient({ endpoint: cosmosDbUri, key: config.COSMOSDB_KEY })
  : new CosmosClient({
      aadCredentials: new DefaultAzureCredential(),
      endpoint: cosmosDbUri,
    });

export const cosmosdbInstance = cosmosdbClient.database(cosmosDbName);

// Setup remote content cosmosdb
export const remoteContentCosmosDbUri = config.REMOTE_CONTENT_COSMOSDB_URI;
export const remoteContentCosmosDbName = config.REMOTE_CONTENT_COSMOSDB_NAME;

export const remoteContentCosmosdbClient = config.REMOTE_CONTENT_COSMOSDB_KEY
  ? new CosmosClient({
      endpoint: remoteContentCosmosDbUri,
      key: config.REMOTE_CONTENT_COSMOSDB_KEY,
    })
  : new CosmosClient({
      aadCredentials: new DefaultAzureCredential(),
      endpoint: remoteContentCosmosDbUri,
    });

export const remoteContentCosmosdbInstance =
  remoteContentCosmosdbClient.database(remoteContentCosmosDbName);
