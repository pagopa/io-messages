import { EventErrorRepository, EventErrorTypesEnum } from "@/domain/event.js";
import {
  Message,
  MessageMetadata,
  MessageRepository,
  messageSchema,
} from "@/domain/message.js";
import { TelemetryEventName, TelemetryService } from "@/domain/telemetry.js";
import { Logger } from "pino";

import {
  MessageContentError,
  MessageContentProvider,
} from "./blob-storage/message-content.js";

export class MessageAdapter implements MessageRepository {
  #content: MessageContentProvider;
  #eventErrorRepository: EventErrorRepository<MessageMetadata>;
  #logger: Logger;
  #telemetryService: TelemetryService;

  constructor(
    messageContent: MessageContentProvider,
    eventErrorRepository: EventErrorRepository<MessageMetadata>,
    telemetryService: TelemetryService,
    logger: Logger,
  ) {
    this.#content = messageContent;
    this.#eventErrorRepository = eventErrorRepository;
    this.#telemetryService = telemetryService;
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
        this.#telemetryService.trackEvent(
          TelemetryEventName.MESSAGE_CONTENT_NOT_FOUND,
          {
            messageId: metadata.id,
          },
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
