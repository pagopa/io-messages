import { MessageContentRepository } from "@/domain/message-content";
import { BlobServiceClient, RestError } from "@azure/storage-blob";
import { readableReport } from "@pagopa/ts-commons/lib/reporters";

import { MessageContent } from "../types/MessageContent";

interface BlobStorageError {
  readonly code: string;
  readonly message: string;
}

const BLOB_NOT_FOUND_CODE = "BlobNotFound";
const GENERIC_CODE = "GenericError";

class BlobStorageErrorException extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = "BlobStorageErrorException";
  }
}

const parseMessageContent = (raw: unknown): MessageContent => {
  const result = MessageContent.decode(raw);
  if (result._tag === "Left") {
    throw new Error(
      `Cannot deserialize stored message content: ${readableReport(result.left)}`,
    );
  }
  return result.right;
};

const isRestError: (u: unknown) => u is RestError = (u): u is RestError =>
  typeof u === "object" &&
  u !== null &&
  u !== undefined &&
  (u as RestError).name === RestError.name;

export class MessageContentRepo implements MessageContentRepository {
  private messageContainerName: string;
  private repository: BlobServiceClient;

  constructor(repository: BlobServiceClient, messageContainerName: string) {
    this.repository = repository;
    this.messageContainerName = messageContainerName;
  }

  private async downloadBlobContent(
    blobName: string,
  ): Promise<BlobStorageError | NodeJS.ReadableStream> {
    try {
      const response = await this.repository
        .getContainerClient(this.messageContainerName)
        .getBlobClient(blobName)
        .download();
      return response.readableStreamBody as NodeJS.ReadableStream;
    } catch (e) {
      const code =
        isRestError(e) && e.statusCode === 404
          ? BLOB_NOT_FOUND_CODE
          : GENERIC_CODE;
      const message =
        isRestError(e) && e.message !== undefined ? e.message : "Unknown error";
      throw new BlobStorageErrorException(code, message);
    }
  }

  private streamToText(readable: NodeJS.ReadableStream): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      const chunks: Buffer[] = [];
      readable.on("data", (chunk: Buffer | string) =>
        chunks.push(
          Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, "utf-8"),
        ),
      );
      readable.on("end", () => {
        resolve(Buffer.concat(chunks).toString("utf-8"));
      });
      readable.on("error", (err) => {
        reject(err);
      });
    });
  }

  async getByMessageContentById(messageId: string): Promise<MessageContent> {
    const blobName = `${messageId}.json`;
    const blobContent = await this.downloadBlobContent(blobName);
    if ("code" in blobContent) {
      throw new Error(
        `Error downloading blob content: ${blobContent.code} - ${blobContent.message}`,
      );
    }
    const content = await this.streamToText(blobContent);
    let parsedContent;
    try {
      parsedContent = JSON.parse(content);
    } catch (e) {
      throw {
        code: GENERIC_CODE,
        message: `Cannot parse content text into object: ${e instanceof Error ? e.message : "Unknown error"}`,
      };
    }

    return parseMessageContent(parsedContent);
  }
}
