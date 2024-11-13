import { EventHubProducerClient } from "@azure/event-hubs";
import { app } from "@azure/functions";
import { AzureCliCredential } from "@azure/identity";
import { BlobServiceClient } from "@azure/storage-blob";
import { loadConfigFromEnvironment } from "io-messages-common/adapters/config";

import { Config, configFromEnvironment } from "./adapters/config.js";

const main = async (config: Config) => {
  const azureCredentials = new AzureCliCredential();
  const blobServiceCLient = new BlobServiceClient(
    config.messageContentStorage.accountUri,
    azureCredentials,
  );

  const producerClient = new EventHubProducerClient(
    config.messagesEventHub.connectionUri,
    config.messagesEventHub.eventHubName,
    azureCredentials,
  );

  app.http("Health", {
    authLevel: "anonymous",
    handler: async () => {
      // check for storage availability or throw
      await blobServiceCLient.getProperties();
      //there's no function to get the producerClient connection status but we check the properties
      await producerClient.getEventHubProperties();

      return {
        body: "it works!",
      };
    },
    methods: ["GET"],
    route: "health",
  });
};

await loadConfigFromEnvironment(main, configFromEnvironment);
