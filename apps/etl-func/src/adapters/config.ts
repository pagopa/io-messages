import { pino } from "pino";
import { ZodError, z } from "zod";

import { envSchema } from "./env.js";

const logger = pino({
  level: "error",
});

export const configSchema = z.object({
  messageContentStorage: z.object({
    accountUri: z.string().url(),
    containerName: z.string().min(1),
  }),
});

export type Config = z.TypeOf<typeof configSchema>;

export const configFromEnvironment = envSchema
  .transform(
    (env): Config => ({
      messageContentStorage: {
        accountUri: env.MESSAGE_CONTENT_STORAGE_URI,
        containerName: env.MESSAGE_CONTAINER_NAME,
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
