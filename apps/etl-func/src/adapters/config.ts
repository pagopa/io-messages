import { z } from "zod";

import { envSchema } from "./env.js";
import { eventhubConfigSchema } from "./eventhub/config.js";

export const configSchema = z.object({
  messageContentStorage: z.object({
    accountUri: z.string().url(),
    containerName: z.string().min(1),
  }),
  messagesEventHub: eventhubConfigSchema,
});

export type Config = z.TypeOf<typeof configSchema>;

export const configFromEnvironment = envSchema
  .transform(
    (env): Config => ({
      messageContentStorage: {
        accountUri: env.MESSAGE_CONTENT_STORAGE_URI,
        containerName: env.MESSAGE_CONTENT_CONTAINER_NAME,
      },
      messagesEventHub: {
        connectionString: env.MESSAGE_EVENTHUB_CONNECTION_STRING,
        eventHubName: env.MESSAGE_EVENTHUB_NAME,
      },
    }),
  )
  .pipe(configSchema);
