import { z } from "zod";

import { envSchema } from "./env.js";

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
        containerName: env.MESSAGE_CONTENT_CONTAINER_NAME,
      },
    }),
  )
  .pipe(configSchema);
