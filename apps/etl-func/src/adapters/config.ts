import { pino } from "pino";
import { ZodError, z } from "zod";

import { envSchema } from "./env.js";

const logger = pino({
  level: "error",
});

export const configSchema = z.object({
  appInsights: z.object({
    connectionString: z.string().min(1),
  }),
});

export type Config = z.TypeOf<typeof configSchema>;

const configFromEnvironment = envSchema
  .transform(
    (env): Config => ({
      appInsights: {
        connectionString: env.APPLICATIONINSIGHTS_CONNECTION_STRING,
      },
    }),
  )
  .pipe(configSchema);

// TODO(IOCOM-1786): move this function in "io-messages-common"
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
