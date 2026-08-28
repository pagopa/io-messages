import type { AppInsightsTelemetryClient } from "@pagopa/hexagonal-core/adapters/logger";
import type { FastifyInstance } from "fastify";

import { CosmosClient } from "@azure/cosmos";
import { DefaultAzureCredential } from "@azure/identity";
import { BlobServiceClient } from "@azure/storage-blob";
import { QueueClient } from "@azure/storage-queue";
import { SeverityNumber, logs } from "@opentelemetry/api-logs";
import { emitCustomEvent } from "@pagopa/azure-tracing/logger";
import { makeApplicationInsightsLogger } from "@pagopa/hexagonal-core/adapters/logger";
import fastify from "fastify";

import { AppConfig } from "./adapters/inbound/config/config.js";
import { mountCreateMessageHandler } from "./adapters/inbound/fastify/create-message.handler.js";
import { mountGetMessagesByUserHandler } from "./adapters/inbound/fastify/get-user-messages.handler.js";
import { mountHealthcheckHandler } from "./adapters/inbound/fastify/healthcheck.handler.js";
import { mountInfoHandler } from "./adapters/inbound/fastify/info.handler.js";
import { CryptoAdapter } from "./adapters/outbound/crypto/crypto.adapter.js";
import { CosmosClientHealthcheckAdapter } from "./adapters/outbound/healthcheckers/cosmos.adapter.js";
import { LoggerHealthcheckAdapter } from "./adapters/outbound/healthcheckers/logger.adapter.js";
import { StorageBlobHealthcheckAdapter } from "./adapters/outbound/healthcheckers/storage-blob.adapter.js";
import { MessageContentBlobAdapter } from "./adapters/outbound/message/message-content.adapter.js";
import { MessageCreatedEventQueueAdapter } from "./adapters/outbound/message/message-created-event.adapter.js";
import { MessageMetadataCosmosAdapter } from "./adapters/outbound/message/message-metadata.adapter.js";
import { MessageStatusCosmosAdapter } from "./adapters/outbound/message/message-status.adapter.js";
import { BlobProcessingMessagePayloadStore } from "./adapters/outbound/message/processing-message.adapter.js";
import { PackageJsonAppInfoReader } from "./adapters/outbound/package-json/package-json-app-info-reader.js";
import { RCConfigurationHttpClientAdapter } from "./adapters/outbound/rc-confguration/rc-configuration.js";
import { ServicesCmsHttpClientAdapter } from "./adapters/outbound/services-cms/services-cms.js";
import { makeCreateMessageUseCase } from "./application/use-cases/create-message.use-case.js";
import { makeGetMessagesByUserUseCase } from "./application/use-cases/get-user-messages.use-case.js";
import { makeHealthcheckUseCase } from "./application/use-cases/healthcheck.use-case.js";
import { makeGetInfoUseCase } from "./application/use-cases/info.use-case.js";

const getQueueUrl = (queueServiceUri: URL, queueName: string): string => {
  const queueUrl = new URL(queueServiceUri);
  queueUrl.pathname = `${queueUrl.pathname.replace(/\/$/, "")}/${queueName}`;
  return queueUrl.toString();
};

export const createApp = (
  config: AppConfig,
): {
  server: FastifyInstance;
} => {
  const aiLogger = logs.getLogger("io-messages-app");
  const stringify = (p?: Record<string, unknown>): Record<string, string> =>
    Object.fromEntries(Object.entries(p ?? {}).map(([k, v]) => [k, String(v)]));

  const client: AppInsightsTelemetryClient = {
    trackEvent: ({ name, properties }) =>
      emitCustomEvent(name, stringify(properties))(),
    trackException: ({ exception, properties }) =>
      aiLogger.emit({
        attributes: {
          ...stringify(properties),
          "exception.stack": exception.stack ?? "",
        },
        body: exception.message,
        severityNumber: SeverityNumber.ERROR,
      }),
    trackTrace: ({ message, properties, severity }) =>
      aiLogger.emit({
        attributes: stringify(properties),
        body: message,
        severityNumber: severity as unknown as SeverityNumber,
      }),
  };

  const logger = makeApplicationInsightsLogger({
    baseProperties: { service: "io-messages-app" },
    client,
  });

  const crypto = new CryptoAdapter();

  const server = fastify({
    // We only enable access logs during local development.
    logger: config.NODE_ENV === "development",
  });

  const appInfoReader = new PackageJsonAppInfoReader(
    config.npm_package_name,
    config.npm_package_version,
  );

  const aadCredentials =
    config.NODE_ENV === "production" ? new DefaultAzureCredential() : undefined;

  const commonCosmosClient =
    config.NODE_ENV === "development"
      ? new CosmosClient(config.COMMON_COSMOS_CONNECTION_STRING)
      : new CosmosClient({
          aadCredentials,
          endpoint: config.COMMON_COSMOS_URI,
        });

  const commonStorageAccountClient =
    config.NODE_ENV === "development"
      ? BlobServiceClient.fromConnectionString(
          config.COMMON_STORAGE_ACCOUNT_CONNECTION_STRING,
        )
      : new BlobServiceClient(
          config.COMMON_STORAGE_ACCOUNT_URI,
          aadCredentials,
        );

  const messageMetadataCosmosAdapter = new MessageMetadataCosmosAdapter(
    commonCosmosClient,
    config.COMMON_COSMOS_DATABASE_NAME,
    config.MESSAGE_METADATA_CONTAINER_NAME,
    logger,
    crypto,
  );

  const messageStatusCosmosAdapter = new MessageStatusCosmosAdapter(
    commonCosmosClient,
    config.COMMON_COSMOS_DATABASE_NAME,
    config.MESSAGE_STATUS_CONTAINER_NAME,
    logger,
  );

  const messageContentBlobAdapter = new MessageContentBlobAdapter(
    commonStorageAccountClient,
    config.MESSAGE_CONTENT_CONTAINER_NAME,
    logger,
  );

  const processingMessagePayloadStore = new BlobProcessingMessagePayloadStore(
    commonStorageAccountClient,
    config.PROCESSING_MESSAGE_CONTAINER_NAME,
  );

  const messageCreatedQueueClient =
    config.NODE_ENV === "development"
      ? new QueueClient(
          config.COMMON_STORAGE_ACCOUNT_CONNECTION_STRING,
          config.MESSAGE_CREATED_QUEUE_NAME,
        )
      : new QueueClient(
          getQueueUrl(
            new URL(config.COMMON_STORAGE_QUEUE_URI),
            config.MESSAGE_CREATED_QUEUE_NAME,
          ),
          aadCredentials,
        );

  const messageCreatedEventPublisher = new MessageCreatedEventQueueAdapter(
    messageCreatedQueueClient,
  );

  const servicesCmsAdapter = new ServicesCmsHttpClientAdapter(
    config.APIM_BASE_URL,
    config.APIM_SUBSCRIPTION_KEY,
    logger,
  );

  const remoteContentConfigurationReposiory =
    new RCConfigurationHttpClientAdapter(config.RC_APP_BASE_URL);

  mountInfoHandler(server, makeGetInfoUseCase(appInfoReader));
  mountHealthcheckHandler(
    server,
    makeHealthcheckUseCase([
      new LoggerHealthcheckAdapter(logger, "logger"),
      new CosmosClientHealthcheckAdapter(commonCosmosClient, "common-cosmos"),
      new StorageBlobHealthcheckAdapter(
        commonStorageAccountClient,
        config.MESSAGE_CONTENT_CONTAINER_NAME,
        "common-storage-account",
      ),
    ]),
  );
  mountCreateMessageHandler(
    server,
    makeCreateMessageUseCase(
      messageMetadataCosmosAdapter,
      servicesCmsAdapter,
      remoteContentConfigurationReposiory,
      processingMessagePayloadStore,
      messageCreatedEventPublisher,
      logger,
    ),
  );
  mountGetMessagesByUserHandler(
    server,
    makeGetMessagesByUserUseCase(
      messageMetadataCosmosAdapter,
      messageStatusCosmosAdapter,
      messageContentBlobAdapter,
      servicesCmsAdapter,
      remoteContentConfigurationReposiory,
      config.PN_SERVICE_ID,
      config.SERVICE_TO_RC_MAP,
      logger,
    ),
  );

  return { server };
};
