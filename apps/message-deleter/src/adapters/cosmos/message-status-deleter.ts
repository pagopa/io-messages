import { MessageStatusDeleter } from "@/domain/message-status.js";
import { Logger } from "@/types.js";
import { Container } from "@azure/cosmos";

export class CosmosMessageStatusDeleter implements MessageStatusDeleter {
  container: Container;
  logger: Logger;

  constructor(container: Container, logger: Logger) {
    this.container = container;
    this.logger = logger;
  }

  /**
   * Deletes all message statuses identified by the partition key.
   *
   * @param partitionKey - The partition key of the items.
   * @returns A promise that resolves when the deletion is complete.
   */
  async deleteMessageStatuses(partitionKey: string): Promise<void> {
    const querySpec = {
      parameters: [{ name: "@partitionKey", value: partitionKey }],
      query: "SELECT c.id FROM c WHERE c.messageId = @partitionKey",
    };

    try {
      const { resources } = await this.container.items
        .query(querySpec)
        .fetchAll();

      this.logger.info(
        `Attempting to delete ${resources.length} message statuses with partition key ${partitionKey}`,
      );

      const deleteResults = await Promise.all(
        resources.map((item) =>
          this.container.item(item.id, partitionKey).delete(),
        ),
      );
      deleteResults.map((response) =>
        this.logger.info(
          `message-status with id ${response.item.id} deleted successfully`,
        ),
      );
    } catch (error) {
      this.logger.error(
        `Error deleting message statuses with partition key ${partitionKey} | Message: ${JSON.stringify(error)}`,
      );
    }
  }
}
