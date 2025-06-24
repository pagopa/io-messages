/**
 * Config module
 *
 * Single point of access for the application confguration. Handles validation on required environment variables.
 * The configuration is evaluate eagerly at the first access to the module. The module exposes convenient methods to access such value.
 */

import { HttpsUrl } from "@pagopa/io-functions-commons/dist/generated/definitions/HttpsUrl";
import { ServiceId } from "@pagopa/io-functions-commons/dist/generated/definitions/ServiceId";
import { MailerConfig } from "@pagopa/io-functions-commons/dist/src/mailer";
import { BooleanFromString } from "@pagopa/ts-commons/lib/booleans";
import { DateFromTimestamp } from "@pagopa/ts-commons/lib/dates";
import {
  NonNegativeIntegerFromString,
  NumberFromString,
} from "@pagopa/ts-commons/lib/numbers";
import { readableReport } from "@pagopa/ts-commons/lib/reporters";
import {
  FiscalCode,
  NonEmptyString,
  PatternString,
  Semver,
} from "@pagopa/ts-commons/lib/strings";
import { withDefault } from "@pagopa/ts-commons/lib/types";
import * as E from "fp-ts/lib/Either";
import * as O from "fp-ts/lib/Option";
import { flow, pipe } from "fp-ts/lib/function";
import * as t from "io-ts";

import { CommaSeparatedListOf } from "./comma-separated-list";

export type HttpUrl = t.TypeOf<typeof HttpsUrl>;
export const HttpUrl = PatternString("^http://[a-zA-Z0-9.-]+(:[0-9]+)?$");

export const BetaUsers = t.readonlyArray(FiscalCode);
export type BetaUsers = t.TypeOf<typeof BetaUsers>;

export const BetaUsersFromString = withDefault(BetaUsers, []).pipe(BetaUsers);

// used for internal job dispatch, temporary files, etc...
const InternalStorageAccount = t.type({
  INTERNAL_STORAGE_CONNECTION_STRING: NonEmptyString,
  // queues for handling message processing jobs
  MESSAGE_CREATED_QUEUE_NAME: NonEmptyString,
  MESSAGE_PROCESSED_QUEUE_NAME: NonEmptyString,
  NOTIFICATION_CREATED_EMAIL_QUEUE_NAME: NonEmptyString,
  NOTIFICATION_CREATED_WEBHOOK_QUEUE_NAME: NonEmptyString,
  // a blob container to keep temporary message processing data
  PROCESSING_MESSAGE_CONTAINER_NAME: NonEmptyString,
});

// used to read and write message content on blob storage
const MessageContentStorageAccount = t.type({
  MESSAGE_CONTAINER_NAME: NonEmptyString,
  MESSAGE_CONTENT_STORAGE_CONNECTION_STRING: NonEmptyString,
});

// global app configuration
export type IConfig = t.TypeOf<typeof IConfig>;
export const IConfig = t.intersection([
  t.type({
    APIM_BASE_URL: NonEmptyString,
    APIM_SUBSCRIPTION_KEY: NonEmptyString,

    APPINSIGHTS_INSTRUMENTATIONKEY: NonEmptyString,

    COSMOSDB_KEY: NonEmptyString,
    COSMOSDB_NAME: NonEmptyString,
    COSMOSDB_URI: NonEmptyString,

    EMAIL_NOTIFICATION_SERVICE_BLACKLIST: CommaSeparatedListOf(ServiceId),

    // eslint-disable-next-line sort-keys
    FF_DISABLE_INCOMPLETE_SERVICES: t.boolean,
    FF_INCOMPLETE_SERVICE_WHITELIST: CommaSeparatedListOf(ServiceId),

    FF_OPT_IN_EMAIL_ENABLED: t.boolean,

    FF_PAYMENT_STATUS_ENABLED: withDefault(BooleanFromString, false),

    // eslint-disable-next-line sort-keys
    MIN_APP_VERSION_WITH_READ_AUTH: Semver,

    OPT_OUT_EMAIL_SWITCH_DATE: DateFromTimestamp,

    PAGOPA_ECOMMERCE_API_KEY: NonEmptyString,
    PAGOPA_ECOMMERCE_BASE_URL: NonEmptyString,
    PENDING_ACTIVATION_GRACE_PERIOD_SECONDS: t.number,
    SANDBOX_FISCAL_CODE: NonEmptyString,
    SENDING_FUNC_API_KEY: NonEmptyString,

    SENDING_FUNC_API_URL: t.union([HttpsUrl, HttpUrl]),

    TTL_FOR_USER_NOT_FOUND: NonNegativeIntegerFromString,

    WEBHOOK_CHANNEL_URL: NonEmptyString,

    WEBHOOK_NOTIFICATION_SERVICE_BLACKLIST: CommaSeparatedListOf(ServiceId),

    isProduction: t.boolean,
  }),
  MessageContentStorageAccount,
  InternalStorageAccount,
  MailerConfig,
]);

// Default value is expressed as a Unix timestamp so it can be safely compared with Cosmos timestamp
// This means that Date representation is in the past compared to the effectively switch Date we want to set
const DEFAULT_OPT_OUT_EMAIL_SWITCH_DATE = 1625781600;

// Default Special Service PENDING grace period is 1 day
export const DEFAULT_PENDING_ACTIVATION_GRACE_PERIOD_SECONDS = 24 * 60 * 60;

export const envConfig = {
  ...process.env,

  FF_DISABLE_INCOMPLETE_SERVICES: pipe(
    O.fromNullable(process.env.FF_DISABLE_INCOMPLETE_SERVICES),
    O.map((_) => _.toLowerCase() === "true"),
    O.getOrElse(() => false),
  ),
  FF_OPT_IN_EMAIL_ENABLED: pipe(
    O.fromNullable(process.env.FF_OPT_IN_EMAIL_ENABLED),
    O.map((_) => _.toLocaleLowerCase() === "true"),
    O.getOrElse(() => false),
  ),
  OPT_OUT_EMAIL_SWITCH_DATE: pipe(
    E.fromNullable(DEFAULT_OPT_OUT_EMAIL_SWITCH_DATE)(
      process.env.OPT_OUT_EMAIL_SWITCH_DATE,
    ),
    E.chain(
      flow(
        NumberFromString.decode,
        E.mapLeft(() => DEFAULT_OPT_OUT_EMAIL_SWITCH_DATE),
      ),
    ),
    E.toUnion,
  ),
  PENDING_ACTIVATION_GRACE_PERIOD_SECONDS: pipe(
    E.fromNullable(DEFAULT_PENDING_ACTIVATION_GRACE_PERIOD_SECONDS)(
      process.env.PENDING_ACTIVATION_GRACE_PERIOD_SECONDS,
    ),
    E.chain(
      flow(
        NumberFromString.decode,
        E.mapLeft(() => DEFAULT_PENDING_ACTIVATION_GRACE_PERIOD_SECONDS),
      ),
    ),
    E.toUnion,
  ),
  isProduction: process.env.NODE_ENV === "production",
};

// No need to re-evaluate this object for each call
const errorOrConfig: t.Validation<IConfig> = IConfig.decode(envConfig);

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
