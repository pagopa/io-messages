/**
 * Config module
 *
 * Single point of access for the application confguration. Handles validation on required environment variables.
 * The configuration is evaluate eagerly at the first access to the module. The module exposes convenient methods to access such value.
 */

import { CommaSeparatedListOf } from "@pagopa/ts-commons/lib/comma-separated-list";
import { IntegerFromString } from "@pagopa/ts-commons/lib/numbers";
import { readableReport } from "@pagopa/ts-commons/lib/reporters";
import { FiscalCode, NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import { withDefault } from "@pagopa/ts-commons/lib/types";
import * as E from "fp-ts/lib/Either";
import { pipe } from "fp-ts/lib/function";
import * as t from "io-ts";

import { FeatureFlag } from "./featureFlag";
import {
  DisjoitedNotificationHubPartitionArray,
  RegExpFromString,
} from "./types";

// Fixed Notification Hub partition configurations
// Partitions are meant to be fixed and not to be extendable at wish
// The following variables will be needed from the app configuration, but will then be computed into an array of struct for convenience
export type NotificationHubPartitionsConfig = t.TypeOf<
  typeof NotificationHubPartitionsConfig
>;
const NotificationHubPartitionsConfig = t.interface({
  NH1_ENDPOINT: NonEmptyString,
  NH1_NAME: NonEmptyString,
  NH1_PARTITION_REGEX: RegExpFromString,

  NH2_ENDPOINT: NonEmptyString,
  NH2_NAME: NonEmptyString,
  NH2_PARTITION_REGEX: RegExpFromString,

  NH3_ENDPOINT: NonEmptyString,
  NH3_NAME: NonEmptyString,
  NH3_PARTITION_REGEX: RegExpFromString,

  NH4_ENDPOINT: NonEmptyString,
  NH4_NAME: NonEmptyString,
  NH4_PARTITION_REGEX: RegExpFromString,
});

export type NewNotificationHubPartitionsConfig = t.TypeOf<
  typeof NewNotificationHubPartitionsConfig
>;
const NewNotificationHubPartitionsConfig = t.interface({
  NEW_NH1_ENDPOINT: NonEmptyString,
  NEW_NH1_NAME: NonEmptyString,
  NEW_NH1_PARTITION_REGEX: RegExpFromString,

  NEW_NH2_ENDPOINT: NonEmptyString,
  NEW_NH2_NAME: NonEmptyString,
  NEW_NH2_PARTITION_REGEX: RegExpFromString,

  NEW_NH3_ENDPOINT: NonEmptyString,
  NEW_NH3_NAME: NonEmptyString,
  NEW_NH3_PARTITION_REGEX: RegExpFromString,

  NEW_NH4_ENDPOINT: NonEmptyString,
  NEW_NH4_NAME: NonEmptyString,
  NEW_NH4_PARTITION_REGEX: RegExpFromString,
});

/**
 * Global app configuration
 */
export type BaseConfig = t.TypeOf<typeof BaseConfig>;
const BaseConfig = t.intersection([
  t.interface({
    COSMOSDB_NAME: NonEmptyString,
    COSMOSDB_URI: NonEmptyString,

    MESSAGE_CONTAINER_NAME: NonEmptyString,
    MESSAGE_CONTENT_STORAGE_CONNECTION_STRING: NonEmptyString,

    SESSION_MANAGER_API_KEY: NonEmptyString,
    SESSION_MANAGER_BASE_URL: NonEmptyString,
  }),
  t.interface({
    NOTIFICATIONS_QUEUE_NAME: NonEmptyString,
    NOTIFICATIONS_STORAGE_CONNECTION_STRING: NonEmptyString,
  }),
  t.interface({
    NOTIFY_MESSAGE_QUEUE_NAME: NonEmptyString,
  }),
  t.intersection([
    t.interface({
      APPINSIGHTS_INSTRUMENTATIONKEY: NonEmptyString,
      // the internal function runtime has MaxTelemetryItem per second set to 20 by default
      // @see https://github.com/Azure/azure-functions-host/blob/master/src/WebJobs.Script/Config/ApplicationInsightsLoggerOptionsSetup.cs#L29
      APPINSIGHTS_SAMPLING_PERCENTAGE: withDefault(IntegerFromString, 5),

      RETRY_ATTEMPT_NUMBER: IntegerFromString,

      isProduction: t.boolean,
    }),

    t.interface({
      // a list of fiscal codes not to send notifications to
      //   use case: when doing internal tests
      FISCAL_CODE_NOTIFICATION_BLACKLIST: withDefault(
        CommaSeparatedListOf(FiscalCode),
        [],
      ),
    }),

    // Legacy Notification Hub configuration
    t.interface({
      AZURE_NH_ENDPOINT: NonEmptyString,
      AZURE_NH_HUB_NAME: NonEmptyString,
    }),

    t.interface({
      NH_PARTITION_BETA_TESTER_LIST: withDefault(t.string, "").pipe(
        CommaSeparatedListOf(NonEmptyString),
      ),
      NH_PARTITION_CANARY_USERS_REGEX: withDefault(t.string, "XYZ").pipe(
        NonEmptyString,
      ),
      NH_PARTITION_FEATURE_FLAG: FeatureFlag,
    }),
  ]),
]);

/**
 * Extends the app base configuration
 * by computing fixed Notification Hub partition configurations
 * into a single array of struct named AZURE_NOTIFICATION_HUB_PARTITIONS.
 */
type WithComputedNHPartitions = {
  readonly AZURE_NOTIFICATION_HUB_PARTITIONS: DisjoitedNotificationHubPartitionArray;
} & BaseConfig;
const WithComputedNHPartitions = new t.Type<
  WithComputedNHPartitions,
  BaseConfig & NotificationHubPartitionsConfig,
  BaseConfig & NotificationHubPartitionsConfig
>(
  "WithComputedNHPartitions",
  (v: unknown): v is WithComputedNHPartitions =>
    BaseConfig.is(v) && "AZURE_NOTIFICATION_HUB_PARTITIONS" in v,
  ({
    NH1_ENDPOINT,
    NH1_NAME,
    NH1_PARTITION_REGEX,
    NH2_ENDPOINT,
    NH2_NAME,
    NH2_PARTITION_REGEX,
    NH3_ENDPOINT,
    NH3_NAME,
    NH3_PARTITION_REGEX,
    NH4_ENDPOINT,
    NH4_NAME,
    NH4_PARTITION_REGEX,
    ...baseConfig
  }): t.Validation<WithComputedNHPartitions> =>
    // decode the fixed array of NH partitions...
    pipe(
      [
        {
          endpoint: NH1_ENDPOINT,
          name: NH1_NAME,
          partitionRegex: NH1_PARTITION_REGEX,
        },
        {
          endpoint: NH2_ENDPOINT,
          name: NH2_NAME,
          partitionRegex: NH2_PARTITION_REGEX,
        },
        {
          endpoint: NH3_ENDPOINT,
          name: NH3_NAME,
          partitionRegex: NH3_PARTITION_REGEX,
        },
        {
          endpoint: NH4_ENDPOINT,
          name: NH4_NAME,
          partitionRegex: NH4_PARTITION_REGEX,
        },
      ],
      DisjoitedNotificationHubPartitionArray.decode,
      // ...then add the key to the base config
      E.map((partitions) => ({
        ...baseConfig,
        AZURE_NOTIFICATION_HUB_PARTITIONS: partitions,
      })),
    ),
  (
    v: WithComputedNHPartitions,
  ): BaseConfig & NotificationHubPartitionsConfig => {
    const { AZURE_NOTIFICATION_HUB_PARTITIONS, ...rest } = v;
    return {
      ...rest,
      ...AZURE_NOTIFICATION_HUB_PARTITIONS.reduce(
        (p, e, i) => ({
          ...p,
          // reconstruct the key set from the array
          [`NH${i}_ENDPOINT`]: e.endpoint,
          [`NH${i}_NAME`]: e.name,
          [`NH${i}_PARTITION_REGEX`]: e.partitionRegex,
        }),
        {},
      ),
    } as BaseConfig & NotificationHubPartitionsConfig; // cast needed because TS cannot understand types when we compose keys with strings
  },
);

/**
 * Extends the app base configuration
 * by computing fixed Notification Hub partition configurations
 * into a single array of struct named AZURE_NEW_NOTIFICATION_HUB_PARTITIONS.
 */
type WithComputedNewNHPartitions = {
  readonly AZURE_NEW_NOTIFICATION_HUB_PARTITIONS: DisjoitedNotificationHubPartitionArray;
} & BaseConfig;
const WithComputedNewNHPartitions = new t.Type<
  WithComputedNewNHPartitions,
  BaseConfig & NewNotificationHubPartitionsConfig,
  BaseConfig & NewNotificationHubPartitionsConfig
>(
  "WithComputedLegacyNHPartitions",
  (v: unknown): v is WithComputedNewNHPartitions =>
    BaseConfig.is(v) && "AZURE_NEW_NOTIFICATION_HUB_PARTITIONS" in v,
  ({
    NEW_NH1_ENDPOINT,
    NEW_NH1_NAME,
    NEW_NH1_PARTITION_REGEX,
    NEW_NH2_ENDPOINT,
    NEW_NH2_NAME,
    NEW_NH2_PARTITION_REGEX,
    NEW_NH3_ENDPOINT,
    NEW_NH3_NAME,
    NEW_NH3_PARTITION_REGEX,
    NEW_NH4_ENDPOINT,
    NEW_NH4_NAME,
    NEW_NH4_PARTITION_REGEX,
    ...baseConfig
  }): t.Validation<WithComputedNewNHPartitions> =>
    // decode the fixed array of NH partitions...
    pipe(
      [
        {
          endpoint: NEW_NH1_ENDPOINT,
          name: NEW_NH1_NAME,
          partitionRegex: NEW_NH1_PARTITION_REGEX,
        },
        {
          endpoint: NEW_NH2_ENDPOINT,
          name: NEW_NH2_NAME,
          partitionRegex: NEW_NH2_PARTITION_REGEX,
        },
        {
          endpoint: NEW_NH3_ENDPOINT,
          name: NEW_NH3_NAME,
          partitionRegex: NEW_NH3_PARTITION_REGEX,
        },
        {
          endpoint: NEW_NH4_ENDPOINT,
          name: NEW_NH4_NAME,
          partitionRegex: NEW_NH4_PARTITION_REGEX,
        },
      ],
      DisjoitedNotificationHubPartitionArray.decode,
      // ...then add the key to the base config
      E.map((partitions) => ({
        ...baseConfig,
        AZURE_NEW_NOTIFICATION_HUB_PARTITIONS: partitions,
      })),
    ),
  (
    v: WithComputedNewNHPartitions,
  ): BaseConfig & NewNotificationHubPartitionsConfig => {
    const { AZURE_NEW_NOTIFICATION_HUB_PARTITIONS, ...rest } = v;
    return {
      ...rest,
      ...AZURE_NEW_NOTIFICATION_HUB_PARTITIONS.reduce(
        (p, e, i) => ({
          ...p,
          // reconstruct the key set from the array
          [`NH${i}_ENDPOINT`]: e.endpoint,
          [`NH${i}_NAME`]: e.name,
          [`NH${i}_PARTITION_REGEX`]: e.partitionRegex,
        }),
        {},
      ),
    } as BaseConfig & NewNotificationHubPartitionsConfig; // cast needed because TS cannot understand types when we compose keys with strings
  },
);

type IConfigLegacy = t.TypeOf<typeof IConfigLegacy>;
const IConfigLegacy = t
  .intersection([BaseConfig, NewNotificationHubPartitionsConfig])
  .pipe(WithComputedNewNHPartitions);

type IConfigBase = t.TypeOf<typeof IConfigBase>;
const IConfigBase = t
  .intersection([BaseConfig, NotificationHubPartitionsConfig])
  .pipe(WithComputedNHPartitions);

export type IConfig = t.TypeOf<typeof IConfig>;
export const IConfig = t.intersection([IConfigBase, IConfigLegacy]);

export const envConfig = {
  ...process.env,
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
    E.getOrElseW((errors) => {
      throw new Error(`Invalid configuration: ${readableReport(errors)}`);
    }),
  );
