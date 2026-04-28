import { MessageContentRepository } from "@/domain/message-content";
import { isRestError } from "@azure/core-rest-pipeline";
import { BlobServiceClient } from "@azure/storage-blob";
import { readableReport } from "@pagopa/ts-commons/lib/reporters";

import { MessageContent } from "../types/MessageContent";
import { readableStreamToUtf8, upsertBlobFromObject } from "./utils";

const BLOB_NOT_FOUND_CODE = "BlobNotFound";
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

export class MessageContentBlobAdapter implements MessageContentRepository {
  private readonly blobClient: BlobServiceClient;
  private readonly messageContainerName: string;

  constructor(blobClient: BlobServiceClient, messageContainerName: string) {
    this.blobClient = blobClient;
    this.messageContainerName = messageContainerName;
  }

  private async downloadBlobContent(
    blobName: string,
  ): Promise<BlobStorageErrorException | NodeJS.ReadableStream> {
    let response;
    try {
      response = await this.blobClient
        .getContainerClient(this.messageContainerName)
        .getBlobClient(blobName)
        .download();
    } catch (e) {
      if (isRestError(e)) {
        switch (e.code) {
          case BLOB_NOT_FOUND_CODE:
            return new BlobStorageErrorException(
              BLOB_NOT_FOUND_CODE,
              e.message,
            );
          default:
            return new BlobStorageErrorException(GENERIC_CODE, e.message);
        }
      }
      if (e instanceof Error) {
        return new BlobStorageErrorException(GENERIC_CODE, e.message);
      }

      return new BlobStorageErrorException(GENERIC_CODE, `Unknown error`);
    }

    if (!response.readableStreamBody) {
      throw new Error("Unexpected: readableStreamBody is undefined");
    }
    return response.readableStreamBody;
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

  async storeMessageContent(
    messageId: string,
    content: MessageContent,
  ): Promise<void> {
    const blobName = `${messageId}.json`;

    try {
      await upsertBlobFromObject(
        this.blobClient,
        this.messageContainerName,
        blobName,
        content,
      );
    } catch (e) {
      throw new Error(
        `Cannot parse content text into object: ${e instanceof Error ? e.message : "Unknown error"}`,
      );
    }
  }
}
