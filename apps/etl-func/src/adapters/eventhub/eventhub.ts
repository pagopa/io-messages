import { EventHubProducerClient } from "@azure/event-hubs";

import { EventhubConfigSchema } from "./config.js";

export async function eventhubProducerClient(
  config: EventhubConfigSchema,
): Promise<EventHubProducerClient> {
  const producerClient = await new EventHubProducerClient(
    config.connectionString,
    config.eventHubName,
  );

  return producerClient;
}
