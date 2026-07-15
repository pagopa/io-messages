import type { FastifyInstance } from "fastify";

import { CosmosClient } from "@azure/cosmos";
import { DefaultAzureCredential } from "@azure/identity";
import fastify from "fastify";

import { AppConfig } from "./adapters/inbound/config/config.js";
import { mountHealthcheckHandler } from "./adapters/inbound/fastify/healthcheck.handler.js";
import { mountInfoHandler } from "./adapters/inbound/fastify/info.handler.js";
import { CosmosClientHealthcheckAdapter } from "./adapters/outbound/healthcheckers/cosmos.adapter.js";
import { PackageJsonAppInfoReader } from "./adapters/outbound/package-json/package-json-app-info-reader.js";
import { makeHealthcheckUseCase } from "./application/use-cases/healthcheck.use-case.js";
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

  mountInfoHandler(server, makeGetInfoUseCase(appInfoReader));
  mountHealthcheckHandler(
    server,
    makeHealthcheckUseCase([
      new CosmosClientHealthcheckAdapter(commonCosmosClient, "common-cosmos"),
    ]),
  );

  return { server };
};
