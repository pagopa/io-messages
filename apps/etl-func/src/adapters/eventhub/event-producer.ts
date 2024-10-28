import { EventDataBatch, EventHubProducerClient } from "@azure/event-hubs";

export class EventProducer {
  #producerClient: EventHubProducerClient;

  constructor(producerClient: EventHubProducerClient) {
    this.#producerClient = producerClient;
  }

  private async addMessageToBatch(message: Buffer): Promise<EventDataBatch> {
    const dataBatch = await this.#producerClient.createBatch();
    const wasAdded = dataBatch.tryAdd({ body: message });
    if (!wasAdded) {
      throw new Error("Error");
    }

    return dataBatch;
  }

  async publishMessage(eventMessage: Buffer): Promise<void> {
    try {
      const dataBatch = await this.addMessageToBatch(eventMessage);
      this.#producerClient.sendBatch(dataBatch);
      return;
    } catch (err) {
      //TODO capire quali errori posso gestire nell'invio di un messaggio: disconnessioni ecc'
      throw new Error("Error while sending the event to the eventhub");
    }
  }
}
