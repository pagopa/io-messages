import z, { ZodError } from "zod";
import { notificationHubConfigSchema } from "./notification-hub/config";

export const applicationInsightsSchema = z.object({
  connectionString: z.string().min(1),
});

export type ApplicationInsightsConfig = z.TypeOf<
  typeof applicationInsightsSchema
>;

export async function loadConfigFromEnvironment<T extends z.ZodTypeAny>(
  onSuccess: (config: z.TypeOf<T>) => Promise<void>,
  configFromEnvironment: T,
) {
  try {
    const config = configFromEnvironment.parse(process.env);
    await onSuccess(config);
  } catch (err) {
    if (err instanceof ZodError) {
      err.issues.forEach((issue) => {
        console.error({ issue }, "Error parsing environment variable");
      });
    } else if (err instanceof Error) {
      console.error(
        {
          err,
        },
        err.message,
      );
    } else {
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
  COM_COSMOS__accountEndpoint: z.url(),
  PUSH_DATABASE_NAME: z.string().min(1),
  INSTALLATION_SUMMARIES_CONTAINER_NAME: z.string().min(1),
  INSTALLATION_SUMMARIES_LEASE_CONTAINER_PREFIX: z.string().min(1),
  NOTIFICATIONS_STORAGE_CONNECTION_STRING: z.string().min(1),
  UPDATE_ALL_INSTALLATIONS_TIME_TO_REACH: z
    .string()
    .transform((val) => Number(val))
    .pipe(z.number().int().positive()),

  NH1_ENDPOINT: z.string().min(1),
  NH1_NAME: z.string().min(1),

  NH2_ENDPOINT: z.string().min(1),
  NH2_NAME: z.string().min(1),

  NH3_ENDPOINT: z.string().min(1),
  NH3_NAME: z.string().min(1),

  NH4_ENDPOINT: z.string().min(1),
  NH4_NAME: z.string().min(1),
});

export type Env = z.TypeOf<typeof envSchema>;

export const configSchema = z.object({
  comCosmosAccountEndpoint: z.url(),
  databaseName: z.string().min(1),
  installationSummariesContainerName: z.string().min(1),
  installationSummariesLeaseContainerPrefix: z.string().min(1),
  notificationStorageConnectionString: z.string().min(1),
  updateAllInstallationsTimeToReach: z.int().positive(),
  notificationHub: notificationHubConfigSchema,
});

export type Config = z.TypeOf<typeof configSchema>;

const mapEnvironmentVariablesToConfig = (env: Env): Config => {
  return {
    comCosmosAccountEndpoint: env.COM_COSMOS__accountEndpoint,
    databaseName: env.PUSH_DATABASE_NAME,
    installationSummariesContainerName:
      env.INSTALLATION_SUMMARIES_CONTAINER_NAME,
    installationSummariesLeaseContainerPrefix:
      env.INSTALLATION_SUMMARIES_LEASE_CONTAINER_PREFIX,

    notificationStorageConnectionString:
      env.NOTIFICATIONS_STORAGE_CONNECTION_STRING,

    notificationHub: {
      partition1: {
        connectionString: env.NH1_ENDPOINT,
        name: env.NH1_NAME,
      },

      partition2: {
        connectionString: env.NH2_ENDPOINT,
        name: env.NH2_NAME,
      },

      partition3: {
        connectionString: env.NH3_ENDPOINT,
        name: env.NH3_NAME,
      },

      partition4: {
        connectionString: env.NH4_ENDPOINT,
        name: env.NH4_NAME,
      },
    },

    updateAllInstallationsTimeToReach:
      env.UPDATE_ALL_INSTALLATIONS_TIME_TO_REACH,
  };
};

export const configFromEnvironment = envSchema
  .transform(mapEnvironmentVariablesToConfig) // Transform the envSchema into a valid Config.
  .pipe(configSchema);
