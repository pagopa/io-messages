/**
 * Config module
 *
 * Single point of access for the application confguration. Handles validation on required environment variables.
 * The configuration is evaluate eagerly at the first access to the module. The module exposes convenient methods to access such value.
 */

import { BooleanFromString } from "@pagopa/ts-commons/lib/booleans";
import {
  IntegerFromString,
  NonNegativeInteger,
} from "@pagopa/ts-commons/lib/numbers";
import { readableReport } from "@pagopa/ts-commons/lib/reporters";
import { NonEmptyString, Ulid } from "@pagopa/ts-commons/lib/strings";
import { withDefault } from "@pagopa/ts-commons/lib/types";
import * as E from "fp-ts/lib/Either";
import * as O from "fp-ts/lib/Option";
import { pipe } from "fp-ts/lib/function";
import * as t from "io-ts";

import { CommaSeparatedListOf } from "./types";

export const RedisParams = t.intersection([
  t.type({
    REDIS_URL: NonEmptyString,
  }),
  t.partial({
    REDIS_PASSWORD: NonEmptyString,
    REDIS_PORT: NonEmptyString,
    REDIS_TLS_ENABLED: t.boolean,
  }),
]);
export type RedisParams = t.TypeOf<typeof RedisParams>;

export const FeatureFlagType = t.union([
  t.literal("none"),
  t.literal("beta"),
  t.literal("canary"),
  t.literal("prod"),
]);
export type FeatureFlagType = t.TypeOf<typeof FeatureFlagType>;

const isMap = (s: t.mixed): s is ReadonlyMap<string, Ulid> => s instanceof Map;

export const UlidMapFromString = new t.Type<ReadonlyMap<string, Ulid>, string>(
  "UlidMapFromString",
  isMap,
  (s, c) => {
    if (typeof s !== "string") {
      return t.failure(s, c);
    }
    try {
      const json = JSON.parse(s);
      const values = Object.values(json);
      if (!values.every(Ulid.is)) {
        return t.failure(s, c);
      }
      return t.success(new Map(Object.entries(json)));
    } catch {
      return t.failure(s, c);
    }
  },
  (a) => JSON.stringify(Object.fromEntries(a.entries())),
);

export type UlidMapFromString = t.TypeOf<typeof UlidMapFromString>;

// global app configuration
export type IConfig = t.TypeOf<typeof IConfig>;
export const IConfig = t.intersection([
  t.type({
    APPLICATIONINSIGHTS_CONNECTION_STRING: NonEmptyString,

    COSMOSDB_NAME: NonEmptyString,
    COSMOSDB_URI: NonEmptyString,

    FF_BETA_TESTER_LIST: withDefault(t.string, "").pipe(
      CommaSeparatedListOf(NonEmptyString),
    ),
    FF_CANARY_USERS_REGEX: withDefault(t.string, "XYZ").pipe(NonEmptyString),

    FF_TYPE: withDefault(t.string, "none").pipe(FeatureFlagType),

    IO_COM_STORAGE_CONNECTION_STRING: NonEmptyString,

    MESSAGE_CONTAINER_NAME: NonEmptyString,
    MESSAGE_CONTENT_STORAGE_CONNECTION_STRING: NonEmptyString,

    PN_SERVICE_ID: NonEmptyString,

    REMOTE_CONTENT_COSMOSDB_NAME: NonEmptyString,

    REMOTE_CONTENT_COSMOSDB_URI: NonEmptyString,
    SERVICE_CACHE_TTL_DURATION: NonNegativeInteger,
    SERVICE_TO_RC_CONFIGURATION_MAP: UlidMapFromString,
    USE_FALLBACK: withDefault(t.string, "false").pipe(BooleanFromString),

    isProduction: t.boolean,
    /* eslint-enable sort-keys */
  }),
  RedisParams,
]);

// No need to re-evaluate this object for each call
const errorOrConfig: t.Validation<IConfig> = IConfig.decode({
  ...process.env,
  REDIS_TLS_ENABLED: pipe(
    O.fromNullable(process.env.REDIS_TLS_ENABLED),
    O.map((_) => _.toLowerCase() === "true"),
    O.toUndefined,
  ),
  SERVICE_CACHE_TTL_DURATION: pipe(
    process.env.SERVICE_CACHE_TTL_DURATION,
    IntegerFromString.decode,
    E.getOrElse(() => 3600 * 8),
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
