import {
  Message,
  MessageMetadata,
  MessageRepository,
  messageSchema,
} from "@/domain/message.js";
import { Logger } from "pino";

import {
  MessageContentError,
  MessageContentProvider,
} from "./blob-storage/message-content.js";

export class MessageAdapter implements MessageRepository {
  #content: MessageContentProvider;
  #logger: Logger;

  constructor(messageContent: MessageContentProvider, logger: Logger) {
    this.#content = messageContent;
    this.#logger = logger;
  }

  async getMessageByMetadata(
    metadata: MessageMetadata,
  ): Promise<Message | undefined> {
    try {
      const messageContent = await this.#content.getByMessageContentById(
        metadata.id,
      );
      return messageSchema.parse({
        content: messageContent,
        id: metadata.id,
        metadata,
      });
    } catch (error) {
      if (error instanceof MessageContentError) {
        this.#logger.error({
          message: "Error parsing the message content.",
          messageId: metadata.id,
        });
        return;
      }
      throw error;
    }
  }
}
