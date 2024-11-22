import { z } from "zod";

import { envSchema } from "./env.js";
import { eventhubConfigSchema } from "./eventhub/config.js";

export const configSchema = z.object({
  messageContentStorage: z.object({
    accountUri: z.string().url(),
    containerName: z.string().min(1),
  }),
  messageStatusEventHub: eventhubConfigSchema,
  messagesEventHub: eventhubConfigSchema,
  pdvTokenizer: z.object({
    apiKey: z.string().min(1),
    baseUrl: z.string().url(),
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
      messageStatusEventHub: {
        connectionUri: env.MESSAGE_STATUS_EVENTHUB_CONNECTION_URI,
        eventHubName: env.MESSAGE_STATUS_EVENTHUB_NAME,
      },
      messagesEventHub: {
        connectionUri: env.MESSAGE_EVENTHUB_CONNECTION_URI,
        eventHubName: env.MESSAGE_EVENTHUB_NAME,
      },
      pdvTokenizer: {
        apiKey: env.PDV_TOKENIZER_API_KEY,
        baseUrl: env.PDV_TOKENIZER_BASE_URL,
      },
    }),
  )
  .pipe(configSchema);
