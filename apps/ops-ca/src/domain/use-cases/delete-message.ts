import { MessageContentDeleter } from "@/adapters/blob-storage/message-content-deleter.js";
import { MessageMetadataDeleter } from "@/adapters/cosmos/message-metadata-deleter.js";
import { MessageStatusDeleter } from "@/adapters/cosmos/message-status-deleter.js";
import { Logger } from "@/types.js";
import { ContainerClient } from "@azure/storage-blob";

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

    try {
      const { statusCode, success } =
        await this.messageMetadataDeleter.deleteMessageMetadata(
          fiscalCode,
          messageId,
        );
      if (success) {
        this.logger.info(`Message metadata with id ${messageId} deleted`);
      } else {
        this.logger.error(
          `Failed to delete message metadata with id ${messageId} (status code ${statusCode})`,
        );
      }

      this.logger.info(
        `Attempting to delete message statuses with partition key ${messageId}`,
      );
      await this.messageStatusDeleter.deleteMessageStatuses(messageId);
      this.logger.info(
        `Message statuses with partition key ${messageId} deleted successfully`,
      );

      await this.messageContentDeleter.deleteMessageContent(messageId);
      this.logger.info(
        `Message content with id ${messageId} deleted successfully`,
      );
    } catch (error) {
      this.logger.error(`${error}`);
    }

    await this.logDeletedMessage(messageId);
  }
}
