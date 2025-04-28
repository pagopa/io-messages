import { MessageRepository } from "@/domain/message.js";
import { Container } from "@azure/cosmos";
import { ContainerClient } from "@azure/storage-blob";
import { Message } from "io-messages-common/domain/message";
import { MessageContent } from "io-messages-common/domain/message";

export class MessageRepositoryAdapter implements MessageRepository {
  contentContainerClient: ContainerClient;
  metadataContainer: Container;

  constructor(
    metadataContainer: Container,
    contentContainerClient: ContainerClient,
  ) {
    this.metadataContainer = metadataContainer;
    this.contentContainerClient = contentContainerClient;
  }

  async #loadContent(
    content: { messageId: string } & MessageContent,
  ): Promise<void> {
    const stringContent = JSON.stringify(content);
    const blobClient = this.contentContainerClient.getBlockBlobClient(
      `${content.messageId}.json`,
    );
    await blobClient.upload(stringContent, stringContent.length);
  }

  async loadMessage(message: Message): Promise<void> {
    await this.metadataContainer.items.create(message.metadata);
    await this.#loadContent({ ...message.content, messageId: message.id });
  }
}
