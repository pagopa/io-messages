import { MessageContentRepository } from "@/domain/message-content";
import { isRestError } from "@azure/core-rest-pipeline";
import { BlobServiceClient } from "@azure/storage-blob";
import { readableReport } from "@pagopa/ts-commons/lib/reporters";

import { MessageContent } from "../types/MessageContent";
import { readableStreamToUtf8 } from "./utils";

const BLOB_NOT_FOUND_CODE = "BlobNotFound";
const GENERIC_CODE = "GenericError";

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
  ): Promise<NodeJS.ReadableStream> {
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

  async getByMessageContentById(messageId: string): Promise<MessageContent> {
    const blobName = `${messageId}.json`;
    const blobContent = await this.downloadBlobContent(blobName);
    const content = await readableStreamToUtf8(blobContent);
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
