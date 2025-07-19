/**
 * Use a singleton CosmosDB client across functions.
 */
import { CosmosClient } from "@azure/cosmos";
import { DefaultAzureCredential } from "@azure/identity";

import { getConfigOrThrow } from "../utils/config";

const config = getConfigOrThrow();

const aadCredentials = new DefaultAzureCredential();

// This service uses two difference CosmosDB instances, because is
// responsible for "Remote Content" and "Notify" features.
// We will refactor this in the future to focus this service on "Remote Content" only.

export const cosmosdbClient = new CosmosClient({
  aadCredentials,
  endpoint: config.COSMOSDB_URI,
});

export const cosmosdbInstance = cosmosdbClient.database(config.COSMOSDB_NAME);
