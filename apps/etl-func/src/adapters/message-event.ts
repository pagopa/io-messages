import type * as avro from "avsc";

import { EventProducer } from "@/domain/message.js";
import {
  EventData,
  EventDataBatch,
  EventHubProducerClient,
} from "@azure/event-hubs";
import * as assert from "node:assert/strict";

export class EventHubEventProducer<T> implements EventProducer<T> {
  #producerClient: EventHubProducerClient;
  #schema: avro.Type;

  constructor(producerClient: EventHubProducerClient, schema: avro.Type) {
    this.#producerClient = producerClient;
    this.#schema = schema;
  }

  /**
   * Creates a batch of event data to be sent to Event Hub.
   *
   * @param eventData - The data to be added to the batch as a Buffer.
   * @returns A promise that resolves to an EventDataBatch containing the event
   * data.
   * @throws Will throw an error if the data is too large to fit in the batch.
   */
  async #createBatch(eventData: EventData): Promise<EventDataBatch> {
    const dataBatch = await this.#producerClient.createBatch();
    const wasAdded = dataBatch.tryAdd(eventData);
    assert.ok(wasAdded, "Error while adding event to the batch");
    return dataBatch;
  }

  async publish(data: T): Promise<void> {
    const bufferedData = this.#schema.toBuffer(data);
    const dataBatch = await this.#createBatch({
      body: bufferedData,
    });
    await this.#producerClient.sendBatch(dataBatch);
  }
}
