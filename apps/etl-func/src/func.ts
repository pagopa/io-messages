import { messageSchema } from "@/adapters/avro.js";
import { EventHubProducerClient } from "@azure/event-hubs";
import { app } from "@azure/functions";
import { AzureCliCredential } from "@azure/identity";
import { BlobServiceClient } from "@azure/storage-blob";
import { loadConfigFromEnvironment } from "io-messages-common/adapters/config";
import { pino } from "pino";

import { aSimpleMessageEvent } from "./__mocks__/message-event.js";
import { Config, configFromEnvironment } from "./adapters/config.js";
import { EventHubEventProducer } from "./adapters/message-event.js";
import { MessageEvent } from "./domain/message.js";

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

  const producerClient = new EventHubProducerClient(
    config.messagesEventHub.connectionString,
    config.messagesEventHub.eventHubName,
  );

  app.http("loadeventmessagetest", {
    authLevel: "anonymous",
    handler: async () => {
      const producer = new EventHubEventProducer<MessageEvent>(
        producerClient,
        messageSchema,
        pino(),
      );
      await producer.publish(aSimpleMessageEvent);
      return {
        body: "message sent",
      };
    },
    methods: ["GET"],
    route: "loadeventmessagetest",
  });
};

await loadConfigFromEnvironment(main, configFromEnvironment);
