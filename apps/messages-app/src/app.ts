import type { AppInsightsTelemetryClient } from "@pagopa/hexagonal-core/adapters/logger";
import type { FastifyInstance } from "fastify";

import { CosmosClient } from "@azure/cosmos";
import { DefaultAzureCredential } from "@azure/identity";
import { BlobServiceClient } from "@azure/storage-blob";
import { SeverityNumber, logs } from "@opentelemetry/api-logs";
import { initAzureMonitor } from "@pagopa/azure-tracing/azure-monitor";
import { emitCustomEvent } from "@pagopa/azure-tracing/logger";
import { makeApplicationInsightsLogger } from "@pagopa/hexagonal-core/adapters/logger";
import fastify from "fastify";

import { AppConfig } from "./adapters/inbound/config/config.js";
import { mountGetMessagesByUserHandler } from "./adapters/inbound/fastify/get-user-messages.handler.js";
import { mountHealthcheckHandler } from "./adapters/inbound/fastify/healthcheck.handler.js";
import { mountInfoHandler } from "./adapters/inbound/fastify/info.handler.js";
import { CryptoAdapter } from "./adapters/outbound/crypto/crypto.adapter.js";
import { CosmosClientHealthcheckAdapter } from "./adapters/outbound/healthcheckers/cosmos.adapter.js";
import { StorageBlobHealthcheckAdapter } from "./adapters/outbound/healthcheckers/storage-blob.adapter.js";
import { MessageContentBlobAdapter } from "./adapters/outbound/message/message-content.adapter.js";
import { MessageMetadataCosmosAdapter } from "./adapters/outbound/message/message-metadata.adapter.js";
import { MessageStatusCosmosAdapter } from "./adapters/outbound/message/message-status.adapter.js";
import { PackageJsonAppInfoReader } from "./adapters/outbound/package-json/package-json-app-info-reader.js";
import { makeGetMessagesByUserUseCase } from "./application/use-cases/get-user-messages.use-case.js";
import { makeHealthcheckUseCase } from "./application/use-cases/healthcheck.use-case.js";
import { makeGetInfoUseCase } from "./application/use-cases/info.use-case.js";

initAzureMonitor();

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

export const createApp = (
  config: AppConfig,
): {
  server: FastifyInstance;
} => {
  const server = fastify({
    // We only enable access logs during local development.
    logger: config.NODE_ENV === "development",
  });

  const appInfoReader = new PackageJsonAppInfoReader(
    config.npm_package_name,
    config.npm_package_version,
  );

  const aadCredentials =
    config.NODE_ENV == "production" ? new DefaultAzureCredential() : undefined;

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

  mountInfoHandler(server, makeGetInfoUseCase(appInfoReader));
  mountHealthcheckHandler(
    server,
    makeHealthcheckUseCase([
      new CosmosClientHealthcheckAdapter(commonCosmosClient, "common-cosmos"),
      new StorageBlobHealthcheckAdapter(
        commonStorageAccountClient,
        config.MESSAGE_CONTENT_CONTAINER_NAME,
        "common-storage-account",
      ),
    ]),
  );
  mountGetMessagesByUserHandler(
    server,
    makeGetMessagesByUserUseCase(
      messageMetadataCosmosAdapter,
      messageStatusCosmosAdapter,
      messageContentBlobAdapter,
      config.PN_SERVICE_ID,
    ),
  );

  return { server };
};
