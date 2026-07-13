import type { FastifyInstance } from "fastify";

import { CosmosClient } from "@azure/cosmos";
import { DefaultAzureCredential } from "@azure/identity";
import { BlobServiceClient } from "@azure/storage-blob";
import fastify from "fastify";

import { AppConfig } from "./adapters/inbound/config/config.js";
import { mountGetMessagesByUserHandler } from "./adapters/inbound/fastify/get-user-messages.handler.js";
import { mountInfoHandler } from "./adapters/inbound/fastify/info.handler.js";
import { MessageContentBlobAdapter } from "./adapters/outbound/message/message-content.adapter.js";
import { MessageMetadataCosmosAdapter } from "./adapters/outbound/message/message-metadata.adapter.js";
import { MessageStatusCosmosAdapter } from "./adapters/outbound/message/message-status.adapter.js";
import { PackageJsonAppInfoReader } from "./adapters/outbound/package-json/package-json-app-info-reader.js";
import { makeGetMessagesByUserUseCase } from "./application/use-cases/get-user-messages.use-case.js";
import { makeGetInfoUseCase } from "./application/use-cases/info.use-case.js";

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

  const aadCredentials = new DefaultAzureCredential();

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
  );

  const messageStatusCosmosAdapter = new MessageStatusCosmosAdapter(
    commonCosmosClient,
    config.COMMON_COSMOS_DATABASE_NAME,
    config.MESSAGE_STATUS_CONTAINER_NAME,
  );

  const messageContentBlobAdapter = new MessageContentBlobAdapter(
    commonStorageAccountClient,
    config.MESSAGE_CONTENT_CONTAINER_NAME,
  );

  mountInfoHandler(server, makeGetInfoUseCase(appInfoReader));
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
