import { MessageRepository } from "@/domain/message.js";
import { Container, Database, ErrorResponse } from "@azure/cosmos";
import { BlobServiceClient, ContainerClient } from "@azure/storage-blob";
import * as assert from "node:assert/strict";
import { z } from "zod";

export class MessageRepositoryAdapter implements MessageRepository {
  #contents: ContainerClient;
  #messages: Container;
  #statuses: Container;

  constructor(db: Database, messageStorage: BlobServiceClient) {
    this.#messages = db.container("messages");
    this.#statuses = db.container("message-status");
    this.#contents = messageStorage.getContainerClient("messages");
  }

  async #deleteContent(messageId: string) {
    const blob = this.#contents.getBlobClient(`${messageId}.json`);
    try {
      await blob.deleteIfExists();
    } catch (e) {
      throw new Error("Failed to delete message content", {
        cause: e,
      });
    }
  }

  async #deleteMetadata(fiscalCode: string, messageId: string) {
    try {
      const result = await this.#messages.item(messageId, fiscalCode).delete();
      assert.strictEqual(result.statusCode, 204);
    } catch (e) {
      if (e instanceof ErrorResponse && e.code === 404) return;

      throw new Error("Failed to delete message metadata", {
        cause: e,
      });
    }
  }

  async #deleteStatuses(partitionKey: string) {
    try {
      const result = await this.#statuses.items
        .readAll({
          partitionKey,
        })
        .fetchAll();

      const resourcesSchema = z.array(z.object({ id: z.string() }));
      const resources = resourcesSchema.parse(result.resources);

      await Promise.all(
        resources.map((item) =>
          this.#statuses.item(item.id, partitionKey).delete(),
        ),
      ).catch((err) => {
        if (err instanceof ErrorResponse && err.code === 404) return;
        throw err;
      });
    } catch (e) {
      throw new Error("Failed to delete message statuses", {
        cause: e,
      });
    }
  }

  async deleteMessage(fiscalCode: string, messageId: string) {
    await this.#deleteMetadata(fiscalCode, messageId);
    await this.#deleteStatuses(messageId);
    await this.#deleteContent(messageId);
  }
}
