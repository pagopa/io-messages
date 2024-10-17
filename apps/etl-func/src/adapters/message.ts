import {
  ContentNotFoundError,
  GetMessageByMetadataReturnType,
  MessageRepository,
  messageMetadataSchema,
} from "@/domain/message.js";
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
    metadataToParse: unknown,
  ): Promise<GetMessageByMetadataReturnType> {
    const parsedMetadata = messageMetadataSchema.safeParse(metadataToParse);
    if (!parsedMetadata.success) {
      this.#logger.error(
        `Error parsing the message metadata | ${JSON.stringify(parsedMetadata.error.issues)}`,
      );
      return parsedMetadata.error;
    }
    const metadata = parsedMetadata.data;
    const message = await this.#content.getMessageByMetadata(
      parsedMetadata.data,
    );
    if (message instanceof z.ZodError) {
      this.#logger.error(
        `Error parsing the message content for message with id: ${metadata.id}`,
      );
      message.issues.map((issue) => this.#logger.error(issue));
      return message;
    }
    if (message instanceof ContentNotFoundError) {
      this.#logger.error(`${message.kind} | ${message.message}`);
      return message;
    } else {
      return message;
    }
  }
}
