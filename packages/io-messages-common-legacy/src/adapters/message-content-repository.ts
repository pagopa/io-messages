import { MessageContentRepository } from "@/domain/message-content";
import { isRestError } from "@azure/core-rest-pipeline";
import { BlobServiceClient } from "@azure/storage-blob";
import { readableReport } from "@pagopa/ts-commons/lib/reporters";

import { MessageContent } from "../types/MessageContent";
import { readableStreamToUtf8 } from "./utils";

const BLOB_NOT_FOUND_CODE = "BlobNotFoundCode";
const GENERIC_CODE = "GenericCode";

export class BlobStorageErrorException extends Error {
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

export class MessageContentRepo implements MessageContentRepository {
  private messageContainerName: string;
  private repository: BlobServiceClient;

  constructor(repository: BlobServiceClient, messageContainerName: string) {
    this.repository = repository;
    this.messageContainerName = messageContainerName;
  }

  private async downloadBlobContent(
    blobName: string,
  ): Promise<BlobStorageErrorException | NodeJS.ReadableStream> {
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
      return new BlobStorageErrorException(code, message);
    }
  }

  async getByMessageContentById(
    messageId: string,
  ): Promise<MessageContent | null> {
    const blobName = `${messageId}.json`;
    const blobRespose = await this.downloadBlobContent(blobName);
    if (blobRespose instanceof BlobStorageErrorException) {
      if (blobRespose.code === BLOB_NOT_FOUND_CODE) {
        return null;
      }
      throw new Error(blobRespose.message);
    }
    const content = await readableStreamToUtf8(blobRespose);
    if (!content || content.length === 0) {
      throw new Error("Cannot get stored message content from empty blob");
    }

    try {
      const parsedContent = JSON.parse(content);
      return parseMessageContent(parsedContent);
    } catch (e) {
      throw new Error(
        `Cannot parse content text into object: ${e instanceof Error ? e.message : "Unknown error"}`,
      );
    }
  }
}
