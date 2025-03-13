import { MessageMetadataDeleter } from "@/domain/message-metadata.js";
import { Logger } from "@/types.js";
import { Container, ErrorResponse } from "@azure/cosmos";

export class CosmosMessageMetadataDeleter implements MessageMetadataDeleter {
  container: Container;
  logger: Logger;

  constructor(container: Container, logger: Logger) {
    this.container = container;
    this.logger = logger;
  }

  /**
   * Deletes a message metadata from the container if it exists.
   *
   * @param fiscalCode - The partition key of the item.
   * @param messageId - The id of the item.
   * @returns A promise that resolves when the deletion is complete.
   */
  async deleteMessageMetadata(
    fiscalCode: string,
    messageId: string,
  ): Promise<void> {
    try {
      const response = await this.container
        .item(messageId, fiscalCode)
        .delete();

      if (response.statusCode === 204) {
        this.logger.info(
          `Message metadata with id ${messageId} deleted successfully`,
        );
      } else {
        this.logger.error(
          `Error deleting message metadata with id ${messageId} | Status: ${response.statusCode}`,
        );
      }
    } catch (error) {
      if (error instanceof ErrorResponse)
        this.logger.error(
          `Error deleting message metadata with id ${messageId} | Code: ${error.code} | Message: ${error.message}`,
        );
      else {
        this.logger.error(
          `Error deleting message metadata with id ${messageId} | ${error}`,
        );
      }
    }
  }
}
