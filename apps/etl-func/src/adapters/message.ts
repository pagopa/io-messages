import {
  MessageMetadata,
  MessageRepository,
} from "@/domain/entities/message.js";
import { GetMessageByMetadataReturnType } from "@/domain/interfaces/message-content-repository.js";
import { RestError } from "@azure/storage-blob";
import { Logger } from "pino";
import * as z from "zod";

import { BlobMessageContent } from "./blob-storage/message-content.js";

export class MessageAdapter implements MessageRepository {
  #content: BlobMessageContent;
  #logger: Logger;

  constructor(messageContent: BlobMessageContent, logger: Logger) {
    this.#content = messageContent;
    this.#logger = logger;
  }

  async getMessageByMetadata(
    metadata: MessageMetadata,
  ): Promise<GetMessageByMetadataReturnType> {
    const message = await this.#content.getMessageByMetadata(metadata);
    if (message instanceof z.ZodError) {
      this.#logger.error(
        `Error parsing the message content for message with id: ${metadata.id}`,
      );
      message.issues.map((issue) => this.#logger.error(issue));
      return message;
    }
    if (message instanceof RestError) {
      this.#logger.error(`${message.name} | ${message.message}`);
      return message;
    } else {
      return message;
    }
  }
}
