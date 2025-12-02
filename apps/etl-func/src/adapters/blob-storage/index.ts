import { DefaultAzureCredential } from "@azure/identity";
import { BlobServiceClient } from "@azure/storage-blob";

import { Config } from "../config.js";

// Return the correct BlobServiceClient based on the environment.
// If the environment is not "production" we use a local docker azurite
// container.
export const makeStorageAccountClient = (
  config: Config,
  credentials: DefaultAzureCredential,
): BlobServiceClient =>
  config.environment === "production"
    ? new BlobServiceClient(
        config.messageContentStorage.accountUri,
        credentials,
      )
    : BlobServiceClient.fromConnectionString(
        config.messageContentStorage.connectionString,
      );

// Temporary duplicated of the above function to connect to the second storage
// account (itn migration purpose).
//
// This function will be removed once the itn migration will end.
export const makeTempStorageAccountClient = (
  config: Config,
  credentials: DefaultAzureCredential,
): BlobServiceClient =>
  config.environment === "production"
    ? new BlobServiceClient(
        config.messageContentStorage.accountUriItn,
        credentials,
      )
    : BlobServiceClient.fromConnectionString(
        config.messageContentStorage.itnConnectionString,
      );
