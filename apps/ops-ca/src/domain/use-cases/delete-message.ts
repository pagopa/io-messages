import { Logger } from "@/types.js";
import { ContainerClient } from "@azure/storage-blob";

import { MessageContentDeleter } from "../message-content.js";
import { MessageMetadataDeleter } from "../message-metadata.js";
import { MessageStatusDeleter } from "../message-status.js";

export class DeleteMessageUseCase {
  deletedMessagesLogs: ContainerClient;
  logger: Logger;
  messageContentDeleter: MessageContentDeleter;
  messageMetadataDeleter: MessageMetadataDeleter;
  messageStatusDeleter: MessageStatusDeleter;

  constructor(
    logger: Logger,
    messageContentDeleter: MessageContentDeleter,
    messageMetadataDeleter: MessageMetadataDeleter,
    messageStatusDeleter: MessageStatusDeleter,
    deletedMessagesLogs: ContainerClient,
  ) {
    this.logger = logger;
    this.messageContentDeleter = messageContentDeleter;
    this.messageMetadataDeleter = messageMetadataDeleter;
    this.messageStatusDeleter = messageStatusDeleter;
    this.deletedMessagesLogs = deletedMessagesLogs;
  }

  private async logDeletedMessage(messageId: string): Promise<void> {
    const blobToUpload = Buffer.from(messageId);
    try {
      await this.deletedMessagesLogs.uploadBlockBlob(
        messageId,
        blobToUpload,
        blobToUpload.length,
      );
    } catch (error) {
      this.logger.error(
        `An error occurred trying to log the deleted message with id ${messageId}: ${error}`,
      );
    }
  }

  /**
   * Executes the deletion of a message.
   * @param {string} fiscalCode - The fiscal code associated with the message.
   * @param {string} messageId - The ID of the message to delete.
   * @returns {Promise<void>}
   */
  async execute(fiscalCode: string, messageId: string): Promise<void> {
    this.logger.info(`Starting deletion of message with id ${messageId}`);

    await this.messageMetadataDeleter.deleteMessageMetadata(
      fiscalCode,
      messageId,
    );

    await this.messageStatusDeleter.deleteMessageStatuses(messageId);
    await this.messageContentDeleter.deleteMessageContent(messageId);
    await this.logDeletedMessage(messageId);
  }
}
