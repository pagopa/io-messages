import {
  EventData,
  EventDataBatch,
  EventHubProducerClient,
} from "@azure/event-hubs";
import * as assert from "node:assert/strict";

export class EventProducer {
  #producerClient: EventHubProducerClient;

  constructor(producerClient: EventHubProducerClient) {
    this.#producerClient = producerClient;
  }

  /**
   * Creates a batch of event data to be sent to Event Hub.
   *
   * @param message - The message to be added to the batch as a Buffer.
   * @returns A promise that resolves to an EventDataBatch containing the message.
   * @throws Will throw an error if the message is too large to fit in the batch.
   */
  async #createBatch(eventData: EventData): Promise<EventDataBatch> {
    const dataBatch = await this.#producerClient.createBatch();
    const wasAdded = dataBatch.tryAdd(eventData);
    assert.ok(wasAdded, "The message is too large to fit in the batch");
    return dataBatch;
  }

  async publish(body: Buffer): Promise<void> {
    try {
      const dataBatch = await this.#createBatch({
        body,
      });
      await this.#producerClient.sendBatch(dataBatch);
    } catch (err) {
      throw new Error("Error while sending the event to the eventhub");
    }
  }
}
