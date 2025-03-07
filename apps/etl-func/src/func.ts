import { CosmosClient } from "@azure/cosmos";
import { TableClient } from "@azure/data-tables";
import { EventHubProducerClient } from "@azure/event-hubs";
import { app } from "@azure/functions";
import { DefaultAzureCredential } from "@azure/identity";
import { BlobServiceClient } from "@azure/storage-blob";
import { loadConfigFromEnvironment } from "io-messages-common/adapters/config";
import { pino } from "pino";
import { createClient } from "redis";

import {
  TelemetryEventService,
  initNoSamplingClient,
} from "./adapters/appinsights/appinsights.js";
import { messageSchema } from "./adapters/avro.js";
import { BlobMessageContent } from "./adapters/blob-storage/message-content.js";
import { Config, configFromEnvironment } from "./adapters/config.js";
import { CosmosIngestionCollector } from "./adapters/cosmos/event-collector.js";
import { EventHubEventProducer } from "./adapters/eventhub/event.js";
import messagesIngestionHandler from "./adapters/functions/messages-ingestion.js";
import { MessageAdapter } from "./adapters/message.js";
import RedisRecipientRepository from "./adapters/redis/recipient.js";
import { EventErrorTableStorage } from "./adapters/table-storage/event-error-table-storage.js";
import { CachedPDVTokenizerClient } from "./adapters/tokenizer/cached-tokenizer-client.js";
import { IngestMessageUseCase } from "./domain/use-cases/ingest-message.js";
import { makeEventHubProducerClient } from "./adapters/eventhub/index.js";

const main = async (config: Config) => {
  const logger = pino({
    level: process.env.NODE_ENV === "production" ? "error" : "debug",
  });

  const azureCredentials = new DefaultAzureCredential();

  const telemetryClient = initNoSamplingClient(config.appInsights);
  const telemetryService = new TelemetryEventService(telemetryClient);

  const blobServiceCLient = new BlobServiceClient(
    config.messageContentStorage.accountUri,
    azureCredentials,
  );

  const messageProducerClient = makeEventHubProducerClient(
    config.messagesEventHub,
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

  const messageIngestionErrorTableClient = new TableClient(
    `${config.messageIngestionErrorTable.connectionUri}${config.messageIngestionErrorTable.tableName}`,
    config.messageIngestionErrorTable.tableName,
    azureCredentials,
  );

  const messageIngestionErrorRepository = new EventErrorTableStorage(
    messageIngestionErrorTableClient,
  );

  const blobMessageContentProvider = new BlobMessageContent(
    blobServiceCLient,
    config.messageContentStorage.containerName,
  );

  const messageEventProducer = new EventHubEventProducer(
    messageProducerClient,
    messageSchema,
  );
  const messageAdapter = new MessageAdapter(
    blobMessageContentProvider,
    messageIngestionErrorRepository,
    telemetryService,
    logger,
  );

  const ioComCosmosClient = new CosmosClient({
    aadCredentials: azureCredentials,
    endpoint: config.iocomCosmos.accountUri,
  });

  const ingestionSummaryContainer = ioComCosmosClient
    .database(config.iocomCosmos.eventsCollectorDatabaseName)
    .container(config.iocomCosmos.messageIngestionSummaryContainerName);

  const messagesWeeklyCollector = new CosmosIngestionCollector(
    ingestionSummaryContainer,
    telemetryService,
  );

  const ingestMessageUseCase = new IngestMessageUseCase(
    messageAdapter,
    tokenizerClient,
    messagesWeeklyCollector,
    messageEventProducer,
  );

  // const messageStatusProducerClient = new EventHubProducerClient(
  //   config.messageStatusEventHub.connectionUri,
  //   config.messageStatusEventHub.eventHubName,
  //   azureCredentials,
  // );

  // const messageStatusEventProducer = new EventHubEventProducer(
  //   messageStatusProducerClient,
  //   messageStatusAvroSchema,
  // );

  // const messageStatusErrorTableClient = new TableClient(
  //   `${config.messageStatusErrorTable.connectionUri}${config.messageStatusErrorTable.tableName}`,
  //   config.messageStatusErrorTable.tableName,
  //   azureCredentials,
  // );

  // const messageStatusErrorRepository = new EventErrorTableStorage(
  //   messageStatusErrorTableClient,
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
        // check for cosmos availability
        await ioComCosmosClient.getDatabaseAccount();
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
    connection: "COMMON_COSMOS",
    containerName: config.common_cosmos.messagesContainerName,
    createLeaseContainerIfNotExists: false,
    databaseName: config.common_cosmos.databaseName,
    handler: messagesIngestionHandler(
      ingestMessageUseCase,
      messageIngestionErrorRepository,
      telemetryService,
    ),
    leaseContainerName: "dataplan-ingestion-lease",
    leaseContainerPrefix: "messages",
    maxItemsPerInvocation: 50,
    retry: {
      maxRetryCount: 5,
      maximumInterval: {
        minutes: 30,
      },
      minimumInterval: {
        minutes: 1,
      },
      strategy: "exponentialBackoff",
    },
    //we need to start the ingestion from this date
    startFromTime: "2023/01/01T00:00:00Z",
  });

  // NOTE: we don't want to start the ingestion yet
  //
  // app.cosmosDB("IngestMessageStatus", {
  //   connection: "COSMOS",
  //   containerName: config.cosmos.messageStatusContainerName,
  //   createLeaseContainerIfNotExists: false,
  //   databaseName: config.cosmos.databaseName,
  //   handler: messageStatusIngestionHandler(
  //     ingestMessageStatusUseCase,
  //     messageStatusErrorRepository,
  //     telemetryService
  //   ),
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
