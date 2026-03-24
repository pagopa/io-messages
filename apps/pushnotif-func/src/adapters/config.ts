import z, { ZodError } from "zod";

import { notificationHubConfigSchema } from "./notification-hub/config";

// TODO: Move this to io-messages-common
export const applicationInsightsSchema = z.object({
  connectionString: z.string().min(1),
  samplingPercentage: z.int().min(1).max(100),
});

// TODO: Move this to io-messages-common
const nodeEnvSchema = z.union([
  z.literal("production"),
  z.literal("development"),
]);

export type ApplicationInsightsConfig = z.TypeOf<
  typeof applicationInsightsSchema
>;

export function loadConfigFromEnvironment<T extends z.ZodTypeAny>(
  onSuccess: (config: z.TypeOf<T>) => void,
  configFromEnvironment: T,
) {
  try {
    const config = configFromEnvironment.parse(process.env);
    onSuccess(config);
  } catch (err) {
    if (err instanceof ZodError) {
      err.issues.forEach((issue) => {
        // eslint-disable-next-line no-console
        console.error(
          "Error parsing environment variable",
          issue.message,
          issue.path,
        );
      });
    } else if (err instanceof Error) {
      // eslint-disable-next-line no-console
      console.error(
        {
          err,
        },
        err.message,
      );
    } else {
      // eslint-disable-next-line no-console
      console.error(
        {
          err,
        },
        "Unable to start the application due to an unexpected error",
      );
    }
  }
}

// envSchema represents the local.settings.json.
const envSchema = z.object({
  APPINSIGHTS_SAMPLING_PERCENTAGE: z
    .string()
    .transform((val) => Number(val))
    .pipe(z.number().int().min(1).max(100)),
  APPLICATIONINSIGHTS_CONNECTION_STRING: z.string().min(1),

  COM_COSMOS__accountEndpoint: z.url(),
  COSMOSDB_NAME: z.string().min(1),

  COSMOSDB_URI: z.url(),
  INSTALLATION_SUMMARIES_CONTAINER_NAME: z.string().min(1),
  INSTALLATION_SUMMARIES_LEASE_CONTAINER_PREFIX: z.string().min(1),

  MESSAGE_CONTENT_STORAGE_CONNECTION_STRING: z.string().min(1),
  NH1_ENDPOINT: z.string().min(1),
  NH1_NAME: z.string().min(1),
  NH1_PARTITION_REGEX: z.string().min(1),

  NH2_ENDPOINT: z.string().min(1),
  NH2_NAME: z.string().min(1),
  NH2_PARTITION_REGEX: z.string().min(1),

  NH3_ENDPOINT: z.string().min(1),
  NH3_NAME: z.string().min(1),
  NH3_PARTITION_REGEX: z.string().min(1),

  NH4_ENDPOINT: z.string().min(1),
  NH4_NAME: z.string().min(1),
  NH4_PARTITION_REGEX: z.string().min(1),

  NODE_ENV: nodeEnvSchema,
  NOTIFICATIONS_STORAGE_CONNECTION_STRING: z.string().min(1),

  PUSH_DATABASE_NAME: z.string().min(1),

  SESSION_MANAGER_API_KEY: z.string().min(1),
  SESSION_MANAGER_BASE_URL: z.url(),

  UPDATE_ALL_INSTALLATIONS_TIME_TO_REACH: z
    .string()
    .transform((val) => Number(val))
    .pipe(z.number().int().positive()),
});

export type Env = z.TypeOf<typeof envSchema>;

export const configSchema = z.object({
  apiCosmos: z.object({
    accountEndpoint: z.url(),
    databaseName: z.string().min(1),
  }),
  apiStorageAccountConnectionString: z.string().min(1),
  applicationInsights: applicationInsightsSchema,
  comCosmos: z.object({
    accountEndpoint: z.url(),
    pushDatabaseName: z.string().min(1),
  }),
  comStorageConnectionString: z.string().min(1),
  databaseName: z.string().min(1),
  installationSummariesContainerName: z.string().min(1),
  installationSummariesLeaseContainerPrefix: z.string().min(1),
  nodeEnv: nodeEnvSchema,
  notificationHub: notificationHubConfigSchema,
  sessionManager: z.object({
    apiKey: z.string().min(1),
    baseUrl: z.url(),
  }),
  updateAllInstallationsTimeToReach: z.int().positive(),
});

export type Config = z.TypeOf<typeof configSchema>;

const mapEnvironmentVariablesToConfig = (env: Env): Config => ({
  apiCosmos: {
    accountEndpoint: env.COSMOSDB_URI,
    databaseName: env.COSMOSDB_NAME,
  },
  apiStorageAccountConnectionString:
    env.MESSAGE_CONTENT_STORAGE_CONNECTION_STRING,
  applicationInsights: {
    connectionString: env.APPLICATIONINSIGHTS_CONNECTION_STRING,
    samplingPercentage: env.APPINSIGHTS_SAMPLING_PERCENTAGE,
  },
  comCosmos: {
    accountEndpoint: env.COM_COSMOS__accountEndpoint,
    pushDatabaseName: env.PUSH_DATABASE_NAME,
  },
  comStorageConnectionString: env.NOTIFICATIONS_STORAGE_CONNECTION_STRING,
  databaseName: env.PUSH_DATABASE_NAME,

  installationSummariesContainerName: env.INSTALLATION_SUMMARIES_CONTAINER_NAME,

  installationSummariesLeaseContainerPrefix:
    env.INSTALLATION_SUMMARIES_LEASE_CONTAINER_PREFIX,

  nodeEnv: env.NODE_ENV,

  notificationHub: {
    partition1: {
      endpoint: env.NH1_ENDPOINT,
      name: env.NH1_NAME,
      partitionRegex: env.NH1_PARTITION_REGEX,
    },

    partition2: {
      endpoint: env.NH2_ENDPOINT,
      name: env.NH2_NAME,
      partitionRegex: env.NH2_PARTITION_REGEX,
    },

    partition3: {
      endpoint: env.NH3_ENDPOINT,
      name: env.NH3_NAME,
      partitionRegex: env.NH3_PARTITION_REGEX,
    },

    partition4: {
      endpoint: env.NH4_ENDPOINT,
      name: env.NH4_NAME,
      partitionRegex: env.NH4_PARTITION_REGEX,
    },
  },

  sessionManager: {
    apiKey: env.SESSION_MANAGER_API_KEY,
    baseUrl: env.SESSION_MANAGER_BASE_URL,
  },

  updateAllInstallationsTimeToReach: env.UPDATE_ALL_INSTALLATIONS_TIME_TO_REACH,
});

export const configFromEnvironment = envSchema
  .transform(mapEnvironmentVariablesToConfig) // Transform the envSchema into a valid Config.
  .pipe(configSchema);
