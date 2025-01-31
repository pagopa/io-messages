import { EventErrorRepository, EventErrorTypesEnum } from "@/domain/event.js";
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
  #eventErrorRepository: EventErrorRepository<MessageMetadata>;
  #logger: Logger;

  constructor(
    messageContent: MessageContentProvider,
    eventErrorRepository: EventErrorRepository<MessageMetadata>,
    logger: Logger,
  ) {
    this.#content = messageContent;
    this.#eventErrorRepository = eventErrorRepository;
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
        await this.#eventErrorRepository.push(
          metadata,
          EventErrorTypesEnum.enum.EVENT_WITH_MISSING_CONTENT,
        );
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
