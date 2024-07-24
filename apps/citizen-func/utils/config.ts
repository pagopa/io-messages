/**
 * Config module
 *
 * Single point of access for the application confguration. Handles validation on required environment variables.
 * The configuration is evaluate eagerly at the first access to the module. The module exposes convenient methods to access such value.
 */

import * as t from "io-ts";

import * as E from "fp-ts/lib/Either";
import * as O from "fp-ts/lib/Option";
import { pipe } from "fp-ts/lib/function";

import { readableReport } from "@pagopa/ts-commons/lib/reporters";
import { NonEmptyString, Ulid } from "@pagopa/ts-commons/lib/strings";
import {
  IntegerFromString,
  NonNegativeInteger
} from "@pagopa/ts-commons/lib/numbers";
import { withDefault } from "@pagopa/ts-commons/lib/types";
import { BooleanFromString } from "@pagopa/ts-commons/lib/booleans";
import { CommaSeparatedListOf } from "./types";

// exclude a specific value from a type
// as strict equality is performed, allowed input types are constrained to be values not references (object, arrays, etc)
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
const AnyBut = <A extends string | number | boolean | symbol, Out = A>(
  but: A,
  base: t.Type<A, Out> = t.any
) =>
  t.brand(
    base,
    (
      s
    ): s is t.Branded<
      t.TypeOf<typeof base>,
      { readonly AnyBut: unique symbol }
    > => s !== but,
    "AnyBut"
  );

// configuration for REQ_SERVICE_ID in dev
export type ReqServiceIdConfig = t.TypeOf<typeof ReqServiceIdConfig>;
export const ReqServiceIdConfig = t.union([
  t.interface({
    NODE_ENV: t.literal("production"),
    REQ_SERVICE_ID: t.undefined
  }),
  t.interface({
    NODE_ENV: AnyBut("production", t.string),
    REQ_SERVICE_ID: NonEmptyString
  })
]);

export const RedisParams = t.intersection([
  t.interface({
    REDIS_URL: NonEmptyString
  }),
  t.partial({
    REDIS_CLUSTER_ENABLED: t.boolean,
    REDIS_PASSWORD: NonEmptyString,
    REDIS_PORT: NonEmptyString,
    REDIS_TLS_ENABLED: t.boolean
  })
]);
export type RedisParams = t.TypeOf<typeof RedisParams>;

export const FeatureFlagType = t.union([
  t.literal("none"),
  t.literal("beta"),
  t.literal("canary"),
  t.literal("prod")
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
    } catch (e) {
      return t.failure(s, c);
    }
  },
  a => JSON.stringify(Object.fromEntries(a.entries()))
);

export type UlidMapFromString = t.TypeOf<typeof UlidMapFromString>;

// global app configuration
export type IConfig = t.TypeOf<typeof IConfig>;
export const IConfig = t.intersection([
  t.interface({
    APPINSIGHTS_INSTRUMENTATIONKEY: NonEmptyString,

    /* eslint-disable sort-keys */
    COSMOSDB_KEY: NonEmptyString,
    COSMOSDB_NAME: NonEmptyString,
    COSMOSDB_URI: NonEmptyString,

    REMOTE_CONTENT_COSMOSDB_KEY: NonEmptyString,
    REMOTE_CONTENT_COSMOSDB_NAME: NonEmptyString,
    REMOTE_CONTENT_COSMOSDB_URI: NonEmptyString,

    SERVICE_TO_RC_CONFIGURATION_MAP: UlidMapFromString,

    MESSAGE_CONTAINER_NAME: NonEmptyString,

    PN_SERVICE_ID: NonEmptyString,

    QueueStorageConnection: NonEmptyString,

    SERVICE_CACHE_TTL_DURATION: NonNegativeInteger,

    FF_TYPE: withDefault(t.string, "none").pipe(FeatureFlagType),
    USE_FALLBACK: withDefault(t.string, "false").pipe(BooleanFromString),
    FF_BETA_TESTER_LIST: withDefault(t.string, "").pipe(
      CommaSeparatedListOf(NonEmptyString)
    ),
    FF_CANARY_USERS_REGEX: withDefault(t.string, "XYZ").pipe(NonEmptyString),

    isProduction: t.boolean
    /* eslint-enable sort-keys */
  }),
  ReqServiceIdConfig,
  RedisParams
]);

// No need to re-evaluate this object for each call
const errorOrConfig: t.Validation<IConfig> = IConfig.decode({
  ...process.env,
  REDIS_CLUSTER_ENABLED: pipe(
    O.fromNullable(process.env.REDIS_CLUSTER_ENABLED),
    O.map(_ => _.toLowerCase() === "true"),
    O.toUndefined
  ),
  REDIS_TLS_ENABLED: pipe(
    O.fromNullable(process.env.REDIS_TLS_ENABLED),
    O.map(_ => _.toLowerCase() === "true"),
    O.toUndefined
  ),
  SERVICE_CACHE_TTL_DURATION: pipe(
    process.env.SERVICE_CACHE_TTL_DURATION,
    IntegerFromString.decode,
    E.getOrElse(() => 3600 * 8)
  ),
  isProduction: process.env.NODE_ENV === "production"
});

/**
 * Read the application configuration and check for invalid values.
 * Configuration is eagerly evalued when the application starts.
 *
 * @returns either the configuration values or a list of validation errors
 */
// eslint-disable-next-line prefer-arrow/prefer-arrow-functions
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
// eslint-disable-next-line prefer-arrow/prefer-arrow-functions
export function getConfigOrThrow(): IConfig {
  return pipe(
    errorOrConfig,
    E.getOrElse(errors => {
      throw new Error(`Invalid configuration: ${readableReport(errors)}`);
    })
  );
}
