import { BlobServiceClient, ContainerClient } from "@azure/storage-blob";
import { z } from "zod";

import { BlobNotFoundError, downloadBlobContent } from "./blob.js";
import {
  MessageContent,
  messageContentSchema,
} from "io-messages-common/domain/message";

export class MessageContentError extends Error {
  name = "MessageContentError";
  constructor(cause: unknown) {
    super("MessageContent invalid or not found", { cause });
  }
}

export interface MessageContentProvider {
  getByMessageContentById(messageId: string): Promise<MessageContent>;
}

export class BlobMessageContent implements MessageContentProvider {
  #messageContainer: ContainerClient;

  constructor(blobClient: BlobServiceClient, messageContainerName: string) {
    this.#messageContainer =
      blobClient.getContainerClient(messageContainerName);
  }

  async getByMessageContentById(messageId: string): Promise<MessageContent> {
    const blobClient = this.#messageContainer.getBlobClient(
      `${messageId}.json`,
    );
    try {
      const blobContent = await downloadBlobContent(blobClient);
      const jsonResponse = JSON.parse(blobContent);
      return messageContentSchema.parse(jsonResponse);
    } catch (error) {
      if (
        error instanceof BlobNotFoundError ||
        error instanceof z.ZodError ||
        error instanceof SyntaxError
      ) {
        throw new MessageContentError(error);
      }
      throw error;
    }
  }
}
