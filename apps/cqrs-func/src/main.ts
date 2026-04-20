import { app } from "@azure/functions";
import { BlobServiceClient } from "@azure/storage-blob";
import { QueueClient } from "@azure/storage-queue";
import { MessageContentBlobAdapter } from "io-messages-common-legacy/adapters/message-content";

import { cosmosMessageStatusHandler } from "./functions/CosmosApiMessageStatusChangeFeedForReminder/handler";
import { cosmosMessagesHandler } from "./functions/CosmosApiMessagesChangeFeed/handler";
import { queueFailureHandler } from "./functions/HandleMessageChangeFeedPublishFailures/handler";
import { Info } from "./functions/Info/handler";
import { initTelemetryClient } from "./utils/appinsights";
import { getConfigOrThrow } from "./utils/config";
import { fromSas } from "./utils/event_hub";
import { avroMessageStatusFormatter } from "./utils/formatter/messageStatusAvroFormatter";
import { avroMessageFormatter } from "./utils/formatter/messagesAvroFormatter";
import { getThirdPartyDataWithCategoryFetcher } from "./utils/message";

// ---------------------------------------------------------------------------
// Shared configuration and dependencies
// ---------------------------------------------------------------------------

const config = getConfigOrThrow();

const telemetryClient = initTelemetryClient(config);

const kafkaMessagesClient = fromSas(
  config.MESSAGES_TOPIC_CONNECTION_STRING,
  config.KAFKA_SSL_ACTIVE,
  avroMessageFormatter(getThirdPartyDataWithCategoryFetcher(config)),
);

const kafkaMessageStatusClient = fromSas(
  config.MESSAGE_STATUS_FOR_REMINDER_TOPIC_PRODUCER_CONNECTION_STRING,
  config.KAFKA_SSL_ACTIVE,
  avroMessageStatusFormatter(),
);

const errorStorage = new QueueClient(
  config.COM_STORAGE_CONNECTION_STRING,
  config.MESSAGE_PAYMENT_UPDATER_FAILURE_QUEUE_NAME,
);

const messageContentRepository = new MessageContentBlobAdapter(
  BlobServiceClient.fromConnectionString(
    config.MESSAGE_CONTENT_STORAGE_CONNECTION,
  ),
  "message-content",
);
// ---------------------------------------------------------------------------
// HTTP Triggers
// ---------------------------------------------------------------------------

app.http("Info", {
  authLevel: "anonymous",
  handler: Info(),
  methods: ["GET"],
  route: "v1/info",
});

// ---------------------------------------------------------------------------
// CosmosDB Change Feeds
// ---------------------------------------------------------------------------

app.cosmosDB("CosmosApiMessagesChangeFeed", {
  connection: "COSMOSDB",
  containerName: "messages",
  createLeaseContainerIfNotExists: true,
  databaseName: config.COSMOSDB_NAME,
  handler: cosmosMessagesHandler(
    messageContentRepository,
    config,
    kafkaMessagesClient,
    errorStorage,
    telemetryClient,
  ),
  leaseContainerName: "cqrs-leases",
  leaseContainerPrefix: config.MESSAGE_CHANGE_FEED_LEASE_PREFIX,
  startFromBeginning: true,
});

app.cosmosDB("CosmosApiMessageStatusChangeFeedForReminder", {
  connection: "COSMOSDB",
  containerName: "message-status",
  createLeaseContainerIfNotExists: true,
  databaseName: config.COSMOSDB_NAME,
  handler: cosmosMessageStatusHandler(kafkaMessageStatusClient),
  leaseContainerName: "cqrs-leases",
  leaseContainerPrefix: "CosmosApiMessageStatusChangeFeedForReminder",
  retry: {
    delayInterval: 10000,
    maxRetryCount: -1,
    strategy: "fixedDelay",
  },
  startFromBeginning: false,
});

// ---------------------------------------------------------------------------
// Storage Queue Triggers
// ---------------------------------------------------------------------------
app.storageQueue("HandleMessageChangeFeedPublishFailures", {
  connection: "COM_STORAGE_CONNECTION_STRING",
  handler: queueFailureHandler(
    telemetryClient,
    messageContentRepository,
    kafkaMessagesClient,
  ),
  queueName: config.MESSAGE_PAYMENT_UPDATER_FAILURE_QUEUE_NAME,
});
