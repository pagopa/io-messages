import { BlobClient, RestError } from "@azure/storage-blob";

export class BlobNotFoundError extends Error {
  constructor() {
    super("The specified blob does not exist");
  }
}

export async function downloadBlobContent(
  blobClient: BlobClient,
): Promise<string> {
  try {
    const downloadBlockBlobResponse = await blobClient.downloadToBuffer();
    return downloadBlockBlobResponse.toString();
  } catch (error) {
    if (error instanceof RestError && error.code === "BlobNotFound") {
      throw new BlobNotFoundError();
    }
    throw error;
  }
}
