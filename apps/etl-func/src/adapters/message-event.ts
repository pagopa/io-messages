import type * as avro from "avsc";

import { EventProducer } from "@/domain/message.js";
import { EventHubProducerClient } from "@azure/event-hubs";
import * as assert from "node:assert/strict";

export class EventHubEventProducer<T> implements EventProducer<T> {
  #producerClient: EventHubProducerClient;
  #schema: avro.Type;

  constructor(producerClient: EventHubProducerClient, schema: avro.Type) {
    this.#producerClient = producerClient;
    this.#schema = schema;
  }

  async publish(messages: T[]): Promise<void> {
    const dataBatch = await this.#producerClient.createBatch();
    for (const message of messages) {
      const wasAdded = dataBatch.tryAdd({
        body: this.#schema.toBuffer(message),
      });
      assert.ok(wasAdded, "Error while adding event to the batch");
    }
    await this.#producerClient.sendBatch(dataBatch);
  }
}
