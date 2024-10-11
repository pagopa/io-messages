import {
  Message,
  MessageMetadata,
  MessageRepository,
} from "@/domain/entities/message.js";
import { BlobMessageContent } from "./blob-storage/message-content.js";
import * as z from "zod";
import { ContentNotFoundError } from "@/domain/interfaces/errors.js";

export class MessageAdapter implements MessageRepository {
  #content: BlobMessageContent;

  constructor(messageContent: BlobMessageContent) {
    this.#content = messageContent;
  }

  async getMessageByMetadata(metadata: MessageMetadata) {
    try {
      const message = await this.#content.getMessageByMetadata(metadata);
      if (message instanceof z.ZodError) {
        //TODO: add a log here
        return;
      }
      if (message instanceof ContentNotFoundError) {
        //TODO: add a log here
        return;
      } else {
        return message;
      }
    } catch (error) {
      throw error;
    }
  }
}
