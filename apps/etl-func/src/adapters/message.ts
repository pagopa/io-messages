import {
  Message,
  MessageContent,
  MessageMetadata,
  MessageRepository,
} from "@/domain/message.js";
import { Logger } from "pino";

import { MessageContentError } from "./blob-storage/message-content.js";

export interface MessageContentProvider {
  getByMessageId(messageId: string): Promise<MessageContent>;
}

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
      const messageContent = await this.#content.getByMessageId(metadata.id);
      return Message.from(metadata.id, messageContent, metadata);
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
