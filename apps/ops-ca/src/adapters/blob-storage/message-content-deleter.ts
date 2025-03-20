import { ContainerClient } from "@azure/storage-blob";

export interface MessageContentDeleter {
  deleteMessageContent: (messageId: string) => Promise<boolean>;
}

export class BlobMessageContentDeleter implements MessageContentDeleter {
  private containerClient: ContainerClient;

  constructor(containerClient: ContainerClient) {
    this.containerClient = containerClient;
  }

  /**
   * Deletes the content of a message from Azure Blob Storage.
   *
   * @param messageId - The ID of the message whose content is to be deleted.
   * @returns A promise that resolves to a DeleteMessageContentResponse indicating success or failure.
   */
  async deleteMessageContent(messageId: string): Promise<boolean> {
    try {
      const response = await this.containerClient
        .getBlobClient(`${messageId}.json`)
        .deleteIfExists();

      return response.succeeded;
    } catch (cause) {
      throw new Error(
        `Failed to delete message content for message ${messageId}`,
        { cause },
      );
    }
  }
}
