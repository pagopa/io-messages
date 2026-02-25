import z, { ZodError } from "zod";

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
});

export type Env = z.TypeOf<typeof envSchema>;

export const configSchema = z.object({
  comCosmosAccountEndpoint: z.url(),
  databaseName: z.string().min(1),
  installationSummariesContainerName: z.string().min(1),
});

export type Config = z.TypeOf<typeof configSchema>;

const mapEnvironmentVariablesToConfig = (env: Env): Config => {
  return {
    comCosmosAccountEndpoint: env.COM_COSMOS__accountEndpoint,
    databaseName: env.PUSH_DATABASE_NAME,
    installationSummariesContainerName:
      env.INSTALLATION_SUMMARIES_CONTAINER_NAME,
  };
};

export const configFromEnvironment = envSchema
  .transform(mapEnvironmentVariablesToConfig) // Transform the envSchema into a valid Config.
  .pipe(configSchema);
