import { Container } from "@azure/cosmos";

interface DeleteMessageStatusResponse {
  readonly failedOperation?: number;
  readonly success: boolean;
}

export interface MessageStatusDeleter {
  deleteMessageStatuses: (
    partitionKey: string,
  ) => Promise<DeleteMessageStatusResponse>;
}

export class CosmosMessageStatusDeleter implements MessageStatusDeleter {
  container: Container;

  constructor(container: Container) {
    this.container = container;
  }

  /**
   * Deletes message statuses based on the provided partition key.
   *
   * @param partitionKey - The partition key used to identify the message statuses to delete.
   * @returns A promise that resolves to a boolean indicating whether the deletion was successful.
   */
  async deleteMessageStatuses(
    partitionKey: string,
  ): Promise<DeleteMessageStatusResponse> {
    const querySpec = {
      parameters: [{ name: "@partitionKey", value: partitionKey }],
      query: "SELECT c.id FROM c WHERE c.messageId = @partitionKey",
    };

    try {
      const { resources } = await this.container.items
        .query(querySpec)
        .fetchAll();

      const results = await Promise.allSettled(
        resources.map((item) =>
          this.container.item(item.id, partitionKey).delete(),
        ),
      );

      const failed = results.filter((result) => result.status === "rejected");

      if (failed.length > 0) {
        return {
          failedOperation: failed.length,
          success: false,
        };
      }

      return { success: true };
    } catch (cause) {
      throw new Error(
        `Failed to delete message statuses with partition key ${partitionKey}`,
        { cause },
      );
    }
  }
}
