import { BlobServiceClient } from "@azure/storage-blob";

import { ErrorInternal } from "../../domain/error";

export const blobServiceHealthcheck = async (
  client: BlobServiceClient,
): Promise<ErrorInternal | undefined> => {
  try {
    await client.getProperties();
  } catch (err) {
    return new ErrorInternal(`Healthcheck failed for storage account`, err);
  }
};
