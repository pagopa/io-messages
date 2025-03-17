import { Logger } from "@/types.js";

import { MessageContentDeleter } from "../message-content.js";
import { MessageMetadataDeleter } from "../message-metadata.js";
import { MessageStatusDeleter } from "../message-status.js";

export class DeleteMessageUseCase {
  logger: Logger;
  messageContentDeleter: MessageContentDeleter;
  messageMetadataDeleter: MessageMetadataDeleter;
  messageStatusDeleter: MessageStatusDeleter;

  constructor(
    logger: Logger,
    messageContentDeleter: MessageContentDeleter,
    messageMetadataDeleter: MessageMetadataDeleter,
    messageStatusDeleter: MessageStatusDeleter,
  ) {
    this.logger = logger;
    this.messageContentDeleter = messageContentDeleter;
    this.messageMetadataDeleter = messageMetadataDeleter;
    this.messageStatusDeleter = messageStatusDeleter;
  }

  async execute(fiscalCode: string, messageId: string): Promise<void> {
    this.logger.info(`Starting deletion of message with id ${messageId}`);
    await this.messageMetadataDeleter.deleteMessageMetadata(
      fiscalCode,
      messageId,
    );

    await this.messageStatusDeleter.deleteMessageStatuses(messageId);

    await this.messageContentDeleter.deleteMessageContent(messageId);
  }
}
