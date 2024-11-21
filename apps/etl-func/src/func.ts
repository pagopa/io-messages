import { EventHubProducerClient } from "@azure/event-hubs";
import { app } from "@azure/functions";
import { DefaultAzureCredential } from "@azure/identity";
import { BlobServiceClient } from "@azure/storage-blob";
import { loadConfigFromEnvironment } from "io-messages-common/adapters/config";
import { pino } from "pino";

import { messageSchema } from "./adapters/avro.js";
import { BlobMessageContent } from "./adapters/blob-storage/message-content.js";
import { Config, configFromEnvironment } from "./adapters/config.js";
import {
  MessageAdapter,
  getMessageEventFromMessage,
} from "./adapters/message.js";
import { EventHubEventProducer } from "./adapters/message-event.js";
import PDVTokenizerClient from "./adapters/pdv-tokenizer/pdv-tokenizer-client.js";
import { MessageEvent, messageMetadataSchema } from "./domain/message.js";

const main = async (config: Config) => {
  const logger = pino({
    level: process.env.NODE_ENV === "production" ? "error" : "debug",
  });

  const azureCredentials = new DefaultAzureCredential();
  const blobServiceCLient = new BlobServiceClient(
    config.messageContentStorage.accountUri,
    azureCredentials,
  );

  const producerClient = new EventHubProducerClient(
    config.messagesEventHub.connectionUri,
    config.messagesEventHub.eventHubName,
    azureCredentials,
  );

  const PDVTokenizer = new PDVTokenizerClient(
    config.pdvTokenizer.apiKey,
    config.pdvTokenizer.baseUrl,
  );

  const blobMessageContentProvider = new BlobMessageContent(
    blobServiceCLient,
    config.messageContentStorage.containerName,
  );
  const producer = new EventHubEventProducer(producerClient, messageSchema);
  const messageAdapter = new MessageAdapter(blobMessageContentProvider, logger);

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

  const messageIngestion = async (documents: unknown[]) => {
    const messagesToSend: MessageEvent[] = [];
    for (const messageMetadataFromCosmosDB of documents) {
      const messageMetadata = messageMetadataSchema.parse(
        messageMetadataFromCosmosDB,
      );

      const message =
        await messageAdapter.getMessageByMetadata(messageMetadata);

      if (message !== undefined) {
        const messageEvent = await getMessageEventFromMessage(
          message,
          PDVTokenizer,
        );
        messagesToSend.push(messageEvent);
      } else {
        logger.info(
          `${messageMetadata.id} returned an undefined message event`,
        );
      }
    }

    await producer.publish(messagesToSend);
  };

  app.cosmosDB("messagesCosmosDBTrigger", {
    connection: "MESSAGE_COSMOSDB_URI",
    containerName: config.messageCosmosDB.containerName,
    createLeaseContainerIfNotExists: true,
    databaseName: config.messageCosmosDB.databaseName,
    handler: messageIngestion,
    leaseContainerName: `${config.messageCosmosDB.containerName}-ingestion-lease`,
    maxItemsPerInvocation: 30,
    startFromBeginning: true,
  });
};

await loadConfigFromEnvironment(main, configFromEnvironment);
