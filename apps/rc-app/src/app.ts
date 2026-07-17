import type { FastifyInstance } from "fastify";

import { CosmosClient } from "@azure/cosmos";
import { DefaultAzureCredential } from "@azure/identity";
import fastify from "fastify";
import { createClient } from "redis";

import { AppConfig } from "./adapters/inbound/config/config.js";
import { mountHealthcheckHandler } from "./adapters/inbound/fastify/healthcheck.handler.js";
import { mountInfoHandler } from "./adapters/inbound/fastify/info.handler.js";
import { CosmosClientHealthcheckAdapter } from "./adapters/outbound/healthcheckers/cosmos.adapter.js";
import { RedisClientHealthcheckAdapter } from "./adapters/outbound/healthcheckers/redis.adapter.js";
import { PackageJsonAppInfoReader } from "./adapters/outbound/package-json/package-json-app-info-reader.js";
import { makeHealthcheckUseCase } from "./application/use-cases/healthcheck.use-case.js";
import { makeGetInfoUseCase } from "./application/use-cases/info.use-case.js";

export const createApp = async (
  config: AppConfig,
): Promise<{ server: FastifyInstance }> => {
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
      ? new CosmosClient({
          connectionPolicy: {
            enableEndpointDiscovery: false,
          },
          connectionString: config.REMOTE_CONTENT_COSMOS_CONNECTION_STRING,
        })
      : new CosmosClient({
          aadCredentials,
          endpoint: config.REMOTE_CONTENT_COSMOS_URI,
        });

  const redisClient = createClient({
    password: config.REDIS_PASSWORD,
    socket: {
      host: config.REDIS_URL,
      port: config.REDIS_PORT,
    },
  });

  redisClient.on("error", (err) => {
    server.log.error({ err }, "redis error");
  });

  await redisClient.connect();

  mountInfoHandler(server, makeGetInfoUseCase(appInfoReader));
  mountHealthcheckHandler(
    server,
    makeHealthcheckUseCase([
      new CosmosClientHealthcheckAdapter(commonCosmosClient, "common-cosmos"),
      new RedisClientHealthcheckAdapter(redisClient as never, "redis"),
    ]),
  );

  return { server };
};
