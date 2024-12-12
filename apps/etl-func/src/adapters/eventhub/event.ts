import type * as avro from "avsc";

import { EventProducer } from "@/domain/event.js";
import { EventHubProducerClient } from "@azure/event-hubs";
import * as assert from "node:assert/strict";

export class EventHubEventProducer<T> implements EventProducer<T> {
  #producerClient: EventHubProducerClient;
  #schema: avro.Type;

  constructor(producerClient: EventHubProducerClient, schema: avro.Type) {
    this.#producerClient = producerClient;
    this.#schema = schema;
  }

  async publish(events: T[]): Promise<void> {
    const dataBatch = await this.#producerClient.createBatch();
    for (const event of events) {
      const wasAdded = dataBatch.tryAdd({
        body: this.#schema.toBuffer(event),
      });
      assert.ok(wasAdded, "Error while adding event to the batch");
    }
    await this.#producerClient.sendBatch(dataBatch);
  }
}
