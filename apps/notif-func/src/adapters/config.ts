import { pino } from "pino";
import { ZodError, z } from "zod";

import { envSchema } from "./env.js";
import { notificationHubsConfigSchema } from "./notification-hubs/config.js";

const logger = pino({
  level: "error",
});

const prefix = "NOTIFICATION_HUBS_";

export const configSchema = z.object({
  appInsights: z.object({
    connectionString: z.string().min(1),
  }),
  notificationHubs: notificationHubsConfigSchema,
  storage: z.object({
    gcmMigrationInput: z.object({
      connection: z.string().min(1),
      path: z.string().min(1),
      queueName: z.string().min(1),
    }),
  }),
});

export type Config = z.TypeOf<typeof configSchema>;

const configFromEnvironment = envSchema
  .transform(
    (env): Config => ({
      appInsights: {
        connectionString: env.APPLICATIONINSIGHTS_CONNECTION_STRING,
      },
      // into a map with foo=>{connectionString: my-conn-string}
      notificationHubs: {
        hubs: new Map(
          Object.entries(env)
            .filter(([envName]) => envName.startsWith(prefix))
            .map(([envName, envValue]) => [
              envName.slice(prefix.length).replaceAll("_", "-"),
              {
                connectionString: envValue,
              },
            ]),
        ),
      },
      // transforms NOTIFICATION_HUBS_foo=my-conn-string
      storage: {
        gcmMigrationInput: {
          connection: "GCM_MIGRATION",
          path: env.GCM_MIGRATION_PATH,
          queueName: env.GCM_MIGRATION_QUEUE_NAME,
        },
      },
    }),
  )
  .pipe(configSchema);

export async function loadConfigFromEnvironment(
  onSuccess: (config: Config) => Promise<void>,
) {
  try {
    const config = configFromEnvironment.parse(process.env);
    await onSuccess(config);
  } catch (err) {
    if (err instanceof ZodError) {
      err.issues.forEach((issue) => {
        logger.error({ issue }, "Error parsing environment variable");
      });
    } else if (err instanceof Error) {
      logger.error(
        {
          err,
        },
        err.message,
      );
    } else {
      logger.error(
        {
          err,
        },
        "Unable to start the application due to an unexpected error",
      );
    }
  }
}
