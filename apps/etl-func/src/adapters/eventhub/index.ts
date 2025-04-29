import { EventHubProducerClient } from "@azure/event-hubs";
import { TokenCredential } from "@azure/identity";

import { EventHubConfig } from "./config.js";

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
