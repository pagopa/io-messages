import { CosmosClient } from "@azure/cosmos";
import { TableClient } from "@azure/data-tables";
import { app } from "@azure/functions";
import { DefaultAzureCredential } from "@azure/identity";
import { loadConfigFromEnvironment } from "io-messages-common/adapters/config";
import { pino } from "pino";
import { createClient } from "redis";

import {
  TelemetryEventService,
  initNoSamplingClient,
} from "./adapters/appinsights/appinsights.js";
import { messageSchema, messageStatusAvroSchema } from "./adapters/avro.js";
import { makeStorageAccountClient } from "./adapters/blob-storage/index.js";
import { BlobMessageContent } from "./adapters/blob-storage/message-content.js";
import { Config, configFromEnvironment } from "./adapters/config.js";
import { CosmosUserRCConfigurationRepository } from "./adapters/cosmos/user-rc-configuration.js";
import { EventHubEventProducer } from "./adapters/eventhub/event.js";
import { makeEventHubProducerClient } from "./adapters/eventhub/index.js";
import messageStatusIngestionHandler from "./adapters/functions/message-status-ingestion.js";
import messagesIngestionHandler from "./adapters/functions/messages-ingestion.js";
import remoteContentMessageConfigurationChangeFeedHandler from "./adapters/functions/remote-content-message-configuration-change-feed.js";
import { MessageAdapter } from "./adapters/message.js";
import RedisRecipientRepository from "./adapters/redis/recipient.js";
import { EventErrorTableStorage } from "./adapters/table-storage/event-error-table-storage.js";
import { makeTableStorageAccountClient } from "./adapters/table-storage/index.js";
import { CachedPDVTokenizerClient } from "./adapters/tokenizer/cached-tokenizer-client.js";
import { AlignRemoteContentConfigurationUseCase } from "./domain/use-cases/align-remote-content-configuration.js";
import { IngestMessageUseCase } from "./domain/use-cases/ingest-message.js";
import { IngestMessageStatusUseCase } from "./domain/use-cases/ingest-message-status.js";

const main = async (config: Config) => {
  const logger = pino({
    level: process.env.NODE_ENV === "production" ? "error" : "debug",
  });

  const azureCredentials = new DefaultAzureCredential();

  const telemetryClient = initNoSamplingClient(config.appInsights);
  const telemetryService = new TelemetryEventService(telemetryClient);

  const blobServiceClient = makeStorageAccountClient(config, azureCredentials);

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

  const messageIngestionErrorTableClient = makeTableStorageAccountClient(
    config,
    azureCredentials,
  );

  const messageIngestionErrorRepository = new EventErrorTableStorage(
    messageIngestionErrorTableClient,
  );

  const blobMessageContentProvider = new BlobMessageContent(
    blobServiceClient,
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
  const remoteContentDatabase = ioComCosmosClient.database(
    config.iocomCosmos.remoteContentDatabaseName,
  );
  const userRCConfigurationRepository = new CosmosUserRCConfigurationRepository(
    remoteContentDatabase.container(
      config.iocomCosmos.remoteContentUserConfigurationContainerName,
    ),
  );
  const alignRemoteContentConfiguration =
    new AlignRemoteContentConfigurationUseCase(userRCConfigurationRepository);

  const ingestMessageUseCase = new IngestMessageUseCase(
    messageAdapter,
    tokenizerClient,
    messageEventProducer,
  );

  const messageStatusProducerClient = makeEventHubProducerClient(
    config.messageStatusEventHub,
    azureCredentials,
  );

  const messageStatusEventProducer = new EventHubEventProducer(
    messageStatusProducerClient,
    messageStatusAvroSchema,
  );

  const messageStatusErrorTableClient = new TableClient(
    `${config.messageStatusErrorTable.connectionUri}${config.messageStatusErrorTable.tableName}`,
    config.messageStatusErrorTable.tableName,
    azureCredentials,
  );

  const messageStatusErrorRepository = new EventErrorTableStorage(
    messageStatusErrorTableClient,
  );

  const ingestMessageStatusUseCase = new IngestMessageStatusUseCase(
    messageStatusEventProducer,
  );

  app.http("Health", {
    authLevel: "anonymous",
    handler: async () => {
      try {
        // check for storage availability or throw
        await blobServiceClient
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

  app.cosmosDB("IngestMessageStatus", {
    connection: "COMMON_COSMOS",
    containerName: config.common_cosmos.messageStatusContainerName,
    createLeaseContainerIfNotExists: false,
    databaseName: config.common_cosmos.databaseName,
    handler: messageStatusIngestionHandler(
      ingestMessageStatusUseCase,
      messageStatusErrorRepository,
      telemetryService,
    ),
    leaseContainerName: "dataplan-ingestion-lease",
    leaseContainerPrefix: "message-status-2-",
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
    startFromTime: "2026/07/31T00:00:00Z",
  });

  app.cosmosDB("CosmosRemoteContentMessageConfigurationChangeFeed", {
    connection: "IOCOM_COSMOS",
    containerName:
      config.iocomCosmos.remoteContentMessageConfigurationContainerName,
    createLeaseContainerIfNotExists: false,
    databaseName: config.iocomCosmos.remoteContentDatabaseName,
    handler: remoteContentMessageConfigurationChangeFeedHandler(
      alignRemoteContentConfiguration,
      telemetryService,
    ),
    leaseContainerName: config.iocomCosmos.remoteContentLeaseContainerName,
    leaseContainerPrefix: "RemoteContentMessageConfigurationChangeFeed-00",
    retry: {
      delayInterval: 10000,
      maxRetryCount: -1,
      strategy: "fixedDelay",
    },
    startFromBeginning: true,
  });
};

await loadConfigFromEnvironment(main, configFromEnvironment);
