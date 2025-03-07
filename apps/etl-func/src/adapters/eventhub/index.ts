import { EventHubProducerClient } from "@azure/event-hubs";
import { EventHubConfig } from "./config.js";

import { TokenCredential } from "@azure/identity";

export const makeEventHubProducerClient = (
  config: EventHubConfig,
  credential: TokenCredential,
) =>
  config.authStrategy === "Identity"
    ? new EventHubProducerClient(
        config.connectionUri,
        config.eventHubName,
        credential,
      )
    : new EventHubProducerClient(config.connectionString);
