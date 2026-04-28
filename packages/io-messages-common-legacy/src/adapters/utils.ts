import { isRestError } from "@azure/core-rest-pipeline";
import {
  type BlobDownloadOptions,
  BlobServiceClient,
  type BlockBlobUploadOptions,
  BlockBlobUploadResponse,
} from "@azure/storage-blob";
import { readableReport } from "@pagopa/ts-commons/lib/reporters";
import * as t from "io-ts";

export const readableStreamToUtf8 = async (
  readable: NodeJS.ReadableStream,
): Promise<string> =>
  new Promise<string>((resolve, reject) => {
    const chunks: Buffer[] = [];
    readable.on("data", (chunk: Buffer | string) =>
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, "utf-8")),
    );
    readable.on("end", () => {
      resolve(Buffer.concat(chunks).toString("utf-8"));
    });
    readable.on("error", (err) => {
      reject(err);
    });
  });

export const getBlobAsObject = async <A, O, I>(
  type: t.Type<A, O, I>,
  blobServiceClient: BlobServiceClient,
  containerName: string,
  blobName: string,
  options: BlobDownloadOptions = {},
): Promise<A | null> => {
  try {
    const response = await blobServiceClient
      .getContainerClient(containerName)
      .getBlobClient(blobName)
      .download(0, undefined, options);

    if (!response.readableStreamBody) {
      throw new Error("Unexpected: readableStreamBody is undefined");
    }

    const text = await readableStreamToUtf8(response.readableStreamBody);
    const decoded = type.decode(JSON.parse(text));

    if (decoded._tag === "Left") {
      throw new Error(readableReport(decoded.left));
    }

    return decoded.right;
  } catch (e) {
    if (isRestError(e) && (e.statusCode === 404 || e.code === "BlobNotFound")) {
      return null;
    }

    if (e instanceof Error) {
      throw e;
    }

    throw new Error("Unknown error while reading blob");
  }
};

/**
 * Create a new blob (media) from plain text.
 * Assumes that the container <containerName> already exists.
 *
 * @param blobService     the Azure blob service
 * @param containerName   the name of the Azure blob storage container
 * @param blobName        blob storage container name
 * @param text            text to be saved
 */
export const upsertBlobFromText = (
  blobServiceClient: BlobServiceClient,
  containerName: string,
  blobName: string,
  text: Buffer | string,
  options: BlockBlobUploadOptions = {},
): Promise<BlockBlobUploadResponse> => {
  const data = typeof text === "string" ? text : text.toString("utf-8");

  return blobServiceClient
    .getContainerClient(containerName)
    .getBlockBlobClient(blobName)
    .upload(data, Buffer.byteLength(data), options);
};

/**
 * Create a new blob (media) from a typed object.
 * Assumes that the container <containerName> already exists.
 *
 * @param blobService     the Azure blob service
 * @param containerName   the name of the Azure blob storage container
 * @param blobName        blob storage container name
 * @param content         object to be serialized and saved
 */
export const upsertBlobFromObject = <T>(
  blobServiceClient: BlobServiceClient,
  containerName: string,
  blobName: string,
  content: T,
  options: BlockBlobUploadOptions = {},
): Promise<BlockBlobUploadResponse> =>
  upsertBlobFromText(
    blobServiceClient,
    containerName,
    blobName,
    JSON.stringify(content),
    options,
  );
