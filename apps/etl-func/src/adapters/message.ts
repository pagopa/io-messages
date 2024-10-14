import {
  MessageMetadata,
  MessageRepository,
} from "@/domain/entities/message.js";
import { RestError } from "@azure/storage-blob";
import { pino } from "pino";
import * as z from "zod";

import { BlobMessageContent } from "./blob-storage/message-content.js";

const logger = pino({ level: "error" });

export class MessageAdapter implements MessageRepository {
  #content: BlobMessageContent;

  constructor(messageContent: BlobMessageContent) {
    this.#content = messageContent;
  }

  async getMessageByMetadata(metadata: MessageMetadata) {
    const message = await this.#content.getMessageByMetadata(metadata);
    if (message instanceof z.ZodError) {
      logger.error(
        `Error parsing the message content for message with id: ${metadata.id}`,
      );
      message.issues.map((issue) => logger.error(issue));
      return message;
    }
    if (message instanceof RestError) {
      logger.error(`${message.name} | ${message.message}`);
      return message;
    } else {
      return message;
    }
  }
}