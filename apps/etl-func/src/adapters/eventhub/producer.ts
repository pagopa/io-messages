import { EventDataBatch, EventHubProducerClient } from "@azure/event-hubs";

import { EventhubConfigSchema } from "./config.js";

export async function eventhubProducerClient(
  config: EventhubConfigSchema,
): Promise<EventHubProducerClient> {
  const producerClient = await new EventHubProducerClient(
    config.connectionString,
    config.eventHubName,
  );

  return producerClient;
  //TODO capire quali errori posso gestire nella creazione di un client producer
}

export class EventHubMesasgeSender {
  #producerClient: EventHubProducerClient;

  constructor(producerClient: EventHubProducerClient) {
    this.#producerClient = producerClient;
  }

  async addEventMessageToBatch(eventMessage: Buffer): Promise<EventDataBatch> {
    const eventDataBatch = await this.#producerClient.createBatch();
    const wasAdded = eventDataBatch.tryAdd({ body: eventMessage });
    if (!wasAdded) {
      throw new Error("Error");
    }

    return eventDataBatch;
  }

  async publishEvent(eventMessage: Buffer): Promise<void> {
    try {
      const eventDataBatch = await this.addEventMessageToBatch(eventMessage);
      this.#producerClient.sendBatch(eventDataBatch);
      return;
    } catch (err) {
      //TODO capire quali errori posso gestire nell'invio di un messaggio: disconnessioni ecc'
      throw new Error("Error while sending the event to the eventhub");
    }
  }
}
