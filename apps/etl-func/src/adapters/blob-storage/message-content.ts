import { MessageContent, messageContentSchema } from "@/domain/message.js";
import {
  BaseContainerClientWithFallback,
  BlobServiceClientWithFallBack,
} from "@pagopa/azure-storage-migration-kit";
import { z } from "zod";

import { BlobNotFoundError, downloadBlobContent } from "./blob.js";

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
  #messageContainer: BaseContainerClientWithFallback;

  constructor(
    blobClient: BlobServiceClientWithFallBack,
    messageContainerName: string,
  ) {
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
