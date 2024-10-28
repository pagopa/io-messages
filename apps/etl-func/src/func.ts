import { app } from "@azure/functions";
import { AzureCliCredential } from "@azure/identity";
import { BlobServiceClient } from "@azure/storage-blob";
import { loadConfigFromEnvironment } from "io-messages-common/adapters/config";
import { pino } from "pino";

import { aSimpleMessageEvent } from "./__mocks__/message-event.js";
import { Config, configFromEnvironment } from "./adapters/config.js";
import {
  EventHubMesasgeSender,
  eventhubProducerClient,
} from "./adapters/eventhub/event-producer.js";
import { MessageEventAdapter } from "./adapters/message-event.js";

const main = async (config: Config) => {
  const azureCredentials = new AzureCliCredential();
  const blobServiceCLient = new BlobServiceClient(
    config.messageContentStorage.accountUri,
    azureCredentials,
  );
  app.http("Health", {
    authLevel: "anonymous",
    handler: async () => {
      // check for storage availability or throw
      await blobServiceCLient.getProperties();
      return {
        body: "it works!",
      };
    },
    methods: ["GET"],
    route: "health",
  });

  app.http("loadeventmessagetest", {
    authLevel: "anonymous",
    handler: async () => {
      const producerClient = await eventhubProducerClient(
        config.messagesEventHub,
      );
      const messageSender = new EventHubMesasgeSender(producerClient);
      const messageEventAdapter = new MessageEventAdapter(
        messageSender,
        pino(),
      );
      messageEventAdapter.publishMessageEvent(aSimpleMessageEvent);
      return {
        body: "message sent",
      };
    },
    methods: ["GET"],
    route: "loadeventmessagetest",
  });
};

await loadConfigFromEnvironment(main, configFromEnvironment);
