/**
 * Config module
 *
 * Single point of access for the application confguration. Handles validation on required environment variables.
 * The configuration is evaluate eagerly at the first access to the module. The module exposes convenient methods to access such value.
 */

import * as t from "io-ts";

import * as E from "fp-ts/Either";
import { pipe } from "fp-ts/lib/function";
import { readableReport } from "@pagopa/ts-commons/lib/reporters";
import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import { BooleanFromString } from "@pagopa/ts-commons/lib/booleans";

import { AzureEventhubSasFromString } from "@pagopa/fp-ts-kafkajs/dist/lib/KafkaProducerCompact";
import { withDefault } from "@pagopa/ts-commons/lib/types";
import { NumberFromString } from "@pagopa/ts-commons/lib/numbers";

export const MessageChangeFeedConfig = t.type({
  MESSAGE_CHANGE_FEED_LEASE_PREFIX: NonEmptyString,
  MESSAGE_CHANGE_FEED_START_TIME: withDefault(NumberFromString, 0),
});
export type MessageChangeFeedConfig = t.TypeOf<typeof MessageChangeFeedConfig>;
// global app configuration
export type IConfig = t.TypeOf<typeof IConfig>;
export const IConfig = t.intersection([
  t.type({
    APPLICATIONINSIGHTS_CONNECTION_STRING: NonEmptyString,

    COSMOSDB_NAME: NonEmptyString,
    COSMOSDB__accountEndpoint: NonEmptyString,

    COM_STORAGE_CONNECTION_STRING: NonEmptyString,

    MESSAGES_TOPIC_CONNECTION_STRING: AzureEventhubSasFromString,
    MESSAGE_STATUS_FOR_REMINDER_TOPIC_PRODUCER_CONNECTION_STRING:
      AzureEventhubSasFromString,

    MESSAGE_CONTENT_STORAGE_CONNECTION: NonEmptyString,
    MESSAGE_PAYMENT_UPDATER_FAILURE_QUEUE_NAME: NonEmptyString,

    KAFKA_SSL_ACTIVE: BooleanFromString,

    PN_SERVICE_ID: NonEmptyString,

    QueueStorageConnection: NonEmptyString,
  }),
  MessageChangeFeedConfig,
]);

// No need to re-evaluate this object for each call
const errorOrConfig: t.Validation<IConfig> = IConfig.decode(process.env);

/**
 * Read the application configuration and check for invalid values.
 * Configuration is eagerly evalued when the application starts.
 *
 * @returns either the configuration values or a list of validation errors
 */
export const getConfig = (): t.Validation<IConfig> => errorOrConfig;

/**
 * Read the application configuration and check for invalid values.
 * If the application is not valid, raises an exception.
 *
 * @returns the configuration values
 * @throws validation errors found while parsing the application configuration
 */
export const getConfigOrThrow = (): IConfig =>
  pipe(
    errorOrConfig,
    E.getOrElseW((errors: ReadonlyArray<t.ValidationError>) => {
      throw new Error(`Invalid configuration: ${readableReport(errors)}`);
    }),
  );
