/**
 * Config module
 *
 * Single point of access for the application confguration. Handles validation on required environment variables.
 * The configuration is evaluate eagerly at the first access to the module. The module exposes convenient methods to access such value.
 */
import { BooleanFromString } from "@pagopa/ts-commons/lib/booleans";
import {
  IntegerFromString,
  NonNegativeIntegerFromString,
} from "@pagopa/ts-commons/lib/numbers";
import { readableReport } from "@pagopa/ts-commons/lib/reporters";
import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import { withDefault } from "@pagopa/ts-commons/lib/types";
import * as E from "fp-ts/lib/Either";
import * as O from "fp-ts/lib/Option";
import { pipe } from "fp-ts/lib/function";
import * as t from "io-ts";

export const RedisParams = t.intersection([
  t.type({
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

// global app configuration
export const IConfig = t.intersection([
  t.type({
    APPINSIGHTS_DISABLE: withDefault(BooleanFromString, false),
    APPINSIGHTS_SAMPLING_PERCENTAGE: IntegerFromString,
    /* eslint-disable sort-keys */
    APPLICATIONINSIGHTS_CONNECTION_STRING: NonEmptyString,

    BACKEND_BASE_URL: NonEmptyString,
    BACKEND_TOKEN: NonEmptyString,

    COSMOSDB_NAME: NonEmptyString,

    COSMOSDB_URI: NonEmptyString,
    INTERNAL_USER_ID: NonEmptyString,

    MESSAGE_CONTAINER_NAME: NonEmptyString,

    MESSAGE_CONTENT_STORAGE_CONNECTION_STRING: NonEmptyString,
    NOTIFICATION_QUEUE_NAME: NonEmptyString,
    NOTIFICATION_QUEUE_STORAGE_CONNECTION_STRING: NonEmptyString,
    RC_CONFIGURATION_CACHE_TTL: NonNegativeIntegerFromString,

    REMOTE_CONTENT_COSMOSDB_CON_STRING: NonEmptyString,
    REMOTE_CONTENT_COSMOSDB_NAME: NonEmptyString,

    REMOTE_CONTENT_COSMOSDB_URI: NonEmptyString,

    isProduction: t.boolean,
    /* eslint-enable sort-keys */
  }),
  RedisParams,
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
