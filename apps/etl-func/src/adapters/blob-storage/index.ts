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
