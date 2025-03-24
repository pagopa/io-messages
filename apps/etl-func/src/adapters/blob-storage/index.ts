import { BlobServiceClient } from "@azure/storage-blob";
import { StorageAccountConfig } from "./config.js";
import { DefaultAzureCredential } from "@azure/identity";

export const makeStorageAccountService = (
  config: StorageAccountConfig,
  credential: DefaultAzureCredential,
) =>
  config.authStrategy === "Identity"
    ? new BlobServiceClient(config.connectionUri, credential)
    : BlobServiceClient.fromConnectionString(config.connectionString);
