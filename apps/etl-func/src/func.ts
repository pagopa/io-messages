import { EventHubProducerClient } from "@azure/event-hubs";
import { app } from "@azure/functions";
import { DefaultAzureCredential } from "@azure/identity";
import { BlobServiceClient } from "@azure/storage-blob";
import { loadConfigFromEnvironment } from "io-messages-common/adapters/config";
import { pino } from "pino";
import { createClient } from "redis";

import { messageSchema } from "./adapters/avro.js";
import { BlobMessageContent } from "./adapters/blob-storage/message-content.js";
import { Config, configFromEnvironment } from "./adapters/config.js";
import { EventHubEventProducer } from "./adapters/eventhub/event.js";
import messagesIngestionHandler from "./adapters/functions/messages-ingestion.js";
import { MessageAdapter } from "./adapters/message.js";
import RedisRecipientRepository from "./adapters/redis/recipient.js";
import { CachedPDVTokenizerClient } from "./adapters/tokenizer/cached-tokenizer-client.js";
import { IngestMessageUseCase } from "./domain/use-cases/ingest-message.js";

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

  const redis = createClient(config.messagesRedis);

  redis.on("error", (err) => {
    logger.error({ err }, "redis error");
  });

  await redis.connect();

  const recipientRepository = new RedisRecipientRepository(redis);

  const tokenizerClient = new CachedPDVTokenizerClient(
    config.pdvTokenizer.apiKey,
    config.pdvTokenizer.baseUrl,
    recipientRepository,
  );

  const blobMessageContentProvider = new BlobMessageContent(
    blobServiceCLient,
    config.messageContentStorage.containerName,
  );
  const messageEventProducer = new EventHubEventProducer(
    producerClient,
    messageSchema,
  );
  const messageAdapter = new MessageAdapter(blobMessageContentProvider, logger);

  const ingestMessageUseCase = new IngestMessageUseCase(
    messageAdapter,
    tokenizerClient,
    messageEventProducer,
  );

  app.http("Health", {
    authLevel: "anonymous",
    handler: async () => {
      try {
        // check for storage availability or throw
        await blobServiceCLient
          .getContainerClient(config.messageContentStorage.containerName)
          .getProperties();
      } catch (error) {
        logger.error(error);
        throw error;
      }

      return {
        body: "it works!",
      };
    },
    methods: ["GET"],
    route: "health",
  });

  app.cosmosDB("IngestMessages", {
    connection: "COSMOS",
    containerName: config.cosmos.messagesContainerName,
    createLeaseContainerIfNotExists: false,
    databaseName: config.cosmos.databaseName,
    handler: messagesIngestionHandler(ingestMessageUseCase),
    leaseContainerName: `messages-dataplan-ingestion-test-lease`,
    maxItemsPerInvocation: 50,
    retry: {
      maxRetryCount: 5,
      maximumInterval: {
        minutes: 1,
      },
      minimumInterval: {
        seconds: 5,
      },
      strategy: "exponentialBackoff",
    },
    //we need to start the ingestion from this date
    startFromTime: "2023/01/01T00:00:00Z",
  });
};

await loadConfigFromEnvironment(main, configFromEnvironment);
