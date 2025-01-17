import { EventHubProducerClient } from "@azure/event-hubs";
import { app } from "@azure/functions";
import { DefaultAzureCredential } from "@azure/identity";
import { BlobServiceClient } from "@azure/storage-blob";
import { QueueClient } from "@azure/storage-queue";
import { loadConfigFromEnvironment } from "io-messages-common/adapters/config";
import { pino } from "pino";
import { createClient } from "redis";

import { messageSchema } from "./adapters/avro.js";
import { BlobMessageContent } from "./adapters/blob-storage/message-content.js";
import { Config, configFromEnvironment } from "./adapters/config.js";
import { EventHubEventProducer } from "./adapters/eventhub/event.js";
import messagesIngestionErrorQueueHandler from "./adapters/functions/message-ingestion-error-queue.js";
import messagesIngestionHandler from "./adapters/functions/messages-ingestion.js";
import { MessageAdapter } from "./adapters/message.js";
import { EventErrorQueueStorage } from "./adapters/queue-storage/event-error-queue-storage.js";
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

  const messageProducerClient = new EventHubProducerClient(
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
    messageProducerClient,
    messageSchema,
  );
  const messageAdapter = new MessageAdapter(blobMessageContentProvider, logger);

  const ingestMessageUseCase = new IngestMessageUseCase(
    messageAdapter,
    tokenizerClient,
    messageEventProducer,
  );

  const queueClient = new QueueClient(
    config.errorQueueStorage.connectionString,
    config.errorQueueStorage.queueName,
  );

  const eventErrorRepository = new EventErrorQueueStorage(queueClient);

  // const messageStatusProducerClient = new EventHubProducerClient(
  //   config.messageStatusEventHub.connectionUri,
  //   config.messageStatusEventHub.eventHubName,
  //   azureCredentials,
  // );

  // const messageStatusEventProducer = new EventHubEventProducer(
  //   messageStatusProducerClient,
  //   messageStatusAvroSchema,
  // );
  // const ingestMessageStatusUseCase = new IngestMessageStatusUseCase(
  //   messageStatusEventProducer,
  // );

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
    handler: messagesIngestionHandler(
      ingestMessageUseCase,
      eventErrorRepository,
    ),
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

  app.storageQueue("storageQueueTrigger", {
    connection: "QUEUE_STORAGE_MESSAGES_ERROR_CONNECTION_STRING",
    handler: messagesIngestionErrorQueueHandler(ingestMessageUseCase),
    queueName: config.errorQueueStorage.queueName,
  });

  // NOTE: we don't want to start the ingestion yet
  //
  // app.cosmosDB("IngestMessageStatus", {
  //   connection: "COSMOS",
  //   containerName: config.cosmos.messageStatusContainerName,
  //   createLeaseContainerIfNotExists: false,
  //   databaseName: config.cosmos.databaseName,
  //   handler: messageStatusIngestionHandler(ingestMessageStatusUseCase),
  //   leaseContainerName: `message-status-ingestion-lease`,
  //   maxItemsPerInvocation: 50,
  //   retry: {
  //     maxRetryCount: 5,
  //     maximumInterval: {
  //       minutes: 1,
  //     },
  //     minimumInterval: {
  //       seconds: 5,
  //     },
  //     strategy: "exponentialBackoff",
  //   },
  //   //TODO: insert the correct date
  //   // startFromTime: "2023/01/01T00:00:00Z",
  // });
};

await loadConfigFromEnvironment(main, configFromEnvironment);
