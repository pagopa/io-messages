import type * as avro from "avsc";

import { EventProducer } from "@/domain/message.js";
import {
  EventData,
  EventDataBatch,
  EventHubProducerClient,
} from "@azure/event-hubs";
import * as assert from "node:assert/strict";
import { Logger } from "pino";

export class EventHubEventProducer<T> implements EventProducer<T> {
  #logger: Logger;
  #producerClient: EventHubProducerClient;
  #schema: avro.Type;

  constructor(
    producerClient: EventHubProducerClient,
    schema: avro.Type,
    logger: Logger,
  ) {
    this.#producerClient = producerClient;
    this.#schema = schema;
    this.#logger = logger;
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
    assert.ok(wasAdded, "Error while adding event to the batch");
    return dataBatch;
  }

  async publish(message: T): Promise<void> {
    try {
      const bufferedData = this.#schema.toBuffer(message);
      const dataBatch = await this.#createBatch({
        body: bufferedData,
      });
      await this.#producerClient.sendBatch(dataBatch);
    } catch (err) {
      this.#logger.error("Error while sending the event");
      throw err;
    }
  }
}
