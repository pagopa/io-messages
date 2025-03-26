import { Container } from "@azure/cosmos";

interface DeleteMessageMetadataResponse {
  readonly statusCode?: number;
  readonly success: boolean;
}

export interface MessageMetadataDeleter {
  deleteMessageMetadata: (
    partitionKey: string,
    id: string,
  ) => Promise<DeleteMessageMetadataResponse>;
}

export class CosmosMessageMetadataDeleter implements MessageMetadataDeleter {
  container: Container;

  constructor(container: Container) {
    this.container = container;
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
  ): Promise<DeleteMessageMetadataResponse> {
    try {
      const response = await this.container
        .item(messageId, fiscalCode)
        .delete();

      if (response.statusCode === 204) {
        return { success: true };
      } else {
        return { statusCode: response.statusCode, success: false };
      }
    } catch (cause) {
      throw new Error(
        `Failed to delete message metadata for message ${messageId}`,
        { cause },
      );
    }
  }
}
