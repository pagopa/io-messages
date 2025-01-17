import { EventErrorRepository } from "@/domain/event.js";
import { QueueClient } from "@azure/storage-queue";

export class EventErrorQueueStorage<T> implements EventErrorRepository<T> {
  #queueClient: QueueClient;

  constructor(queueClient: QueueClient) {
    this.#queueClient = queueClient;
  }

  async push(item: T): Promise<void> {
    await this.#queueClient.sendMessage(
      Buffer.from(JSON.stringify(item)).toString("base64"),
    );
  }
}
