import { MessageContentDeleter } from "@/domain/message-content.js";
import { Logger } from "@/types.js";
import { ContainerClient } from "@azure/storage-blob";

export class BlobMessageContentDeleter implements MessageContentDeleter {
  private containerClient: ContainerClient;
  private logger: Logger;

  constructor(containerClient: ContainerClient, logger: Logger) {
    this.containerClient = containerClient;
    this.logger = logger;
  }

  /**
   * Deletes the content of a message from Azure Blob Storage.
   *
   * @param messageId - The ID of the message whose content is to be deleted.
   * @returns A promise that resolves to a DeleteMessageContentResponse indicating success or failure.
   */
  async deleteMessageContent(messageId: string): Promise<void> {
    try {
      const response = await this.containerClient
        .getBlobClient(`${messageId}.json`)
        .deleteIfExists();

      if (response.succeeded) {
        this.logger.info(
          `Message content of message with id ${messageId} deleted successfully`,
        );
      } else {
        this.logger.error(
          `Failed to delete message content for message ${messageId} | Error code: ${response.errorCode}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to delete message content for message ${messageId} | Error: ${error}`,
      );
    }
  }
}
