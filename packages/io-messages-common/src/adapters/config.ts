import { pino } from "pino";
import * as z from "zod";
import { ZodError } from "zod";

const logger = pino({
  level: "error",
});

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
