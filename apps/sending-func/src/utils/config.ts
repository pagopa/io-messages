/**
 * Config module
 *
 * Single point of access for the application confguration. Handles validation on required environment variables.
 * The configuration is evaluate eagerly at the first access to the module. The module exposes convenient methods to access such value.
 */
import { NonNegativeIntegerFromString } from "@pagopa/ts-commons/lib/numbers";
import { readableReport } from "@pagopa/ts-commons/lib/reporters";
import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import * as E from "fp-ts/lib/Either";
import * as O from "fp-ts/lib/Option";
import { pipe } from "fp-ts/lib/function";
import * as t from "io-ts";

export const RedisParams = t.intersection([
  t.interface({
    REDIS_URL: NonEmptyString,
  }),
  t.partial({
    REDIS_CLUSTER_ENABLED: t.boolean,
    REDIS_PASSWORD: NonEmptyString,
    REDIS_PORT: NonEmptyString,
    REDIS_TLS_ENABLED: t.boolean,
  }),
]);
export type RedisParams = t.TypeOf<typeof RedisParams>;

/**
 * Configuration parameters for Cosmos DB.
 *
 * This configuration is a combination of:
 * 1. Required parameters for all environments (COSMOSDB_NAME, COSMOSDB_URI)
 * 2. Environment-specific parameters:
 *    - For production environment: only NODE_ENV = "production" is required (we use managed identity)
 *    - For development environment: NODE_ENV = "development" plus COSMOSDB_KEY are required
 *
 * @example
 * // Production configuration
 * {
 *   COSMOSDB_NAME: "mydb",
 *   COSMOSDB_URI: "https://mydb.documents.azure.com:443/",
 *   NODE_ENV: "production"
 * }
 *
 * @example
 * // Development configuration
 * {
 *   COSMOSDB_NAME: "mydb",
 *   COSMOSDB_URI: "https://mydb.documents.azure.com:443/",
 *   NODE_ENV: "development",
 *   COSMOSDB_KEY: "your-cosmos-db-key"
 * }
 */
export const CosmosDbParams = t.intersection([
  t.type({
    COSMOSDB_NAME: NonEmptyString,
    COSMOSDB_URI: NonEmptyString,
    REMOTE_CONTENT_COSMOSDB_NAME: NonEmptyString,
    REMOTE_CONTENT_COSMOSDB_URI: NonEmptyString,
  }),
  t.union([
    t.type({
      NODE_ENV: t.literal("production"),
    }),
    t.type({
      NODE_ENV: t.literal("development"),
      COSMOSDB_KEY: NonEmptyString,
      REMOTE_CONTENT_COSMOSDB_KEY: NonEmptyString,
    }),
  ]),
]);

// global app configuration
export const IConfig = t.intersection([
  t.interface({
    /* eslint-disable sort-keys */
    APPLICATIONINSIGHTS_CONNECTION_STRING: NonEmptyString,

    BACKEND_BASE_URL: NonEmptyString,
    BACKEND_TOKEN: NonEmptyString,

    INTERNAL_USER_ID: NonEmptyString,

    MESSAGE_CONTAINER_NAME: NonEmptyString,
    MESSAGE_CONTENT_STORAGE_CONNECTION_STRING: NonEmptyString,

    NOTIFICATION_QUEUE_NAME: NonEmptyString,
    NOTIFICATION_QUEUE_STORAGE_CONNECTION_STRING: NonEmptyString,

    RC_CONFIGURATION_CACHE_TTL: NonNegativeIntegerFromString,

    isProduction: t.boolean,
    /* eslint-enable sort-keys */
  }),
  RedisParams,
  CosmosDbParams,
]);
export type IConfig = t.TypeOf<typeof IConfig>;

// No need to re-evaluate this object for each call
const errorOrConfig: t.Validation<IConfig> = IConfig.decode({
  ...process.env,

  REDIS_CLUSTER_ENABLED: pipe(
    O.fromNullable(process.env.REDIS_CLUSTER_ENABLED),
    O.map((_) => _.toLowerCase() === "true"),
    O.toUndefined,
  ),
  REDIS_TLS_ENABLED: pipe(
    O.fromNullable(process.env.REDIS_TLS_ENABLED),
    O.map((_) => _.toLowerCase() === "true"),
    O.toUndefined,
  ),

  isProduction: process.env.NODE_ENV === "production",
});

/**
 * Read the application configuration and check for invalid values.
 * Configuration is eagerly evalued when the application starts.
 *
 * @returns either the configuration values or a list of validation errors
 */
export function getConfig(): t.Validation<IConfig> {
  return errorOrConfig;
}

/**
 * Read the application configuration and check for invalid values.
 * If the application is not valid, raises an exception.
 *
 * @returns the configuration values
 * @throws validation errors found while parsing the application configuration
 */
export function getConfigOrThrow(): IConfig {
  return pipe(
    errorOrConfig,
    E.getOrElseW((errors) => {
      throw new Error(`Invalid configuration: ${readableReport(errors)}`);
    }),
  );
}
