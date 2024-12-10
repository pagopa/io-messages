import { z } from "zod";

import { envSchema } from "./env.js";
import { eventhubConfigSchema } from "./eventhub/config.js";
import { redisConfigSchema } from "./redis/config.js";
import { pdvConfigSchema } from "./tokenizer/config.js";

export const configSchema = z.object({
  cosmos: z.object({
    accountUri: z.string().url(),
    databaseName: z.string().min(1),
    messagesContainerName: z.string().min(1),
  }),
  messageContentStorage: z.object({
    accountUri: z.string().url(),
    containerName: z.string().min(1),
  }),
  messagesEventHub: eventhubConfigSchema,
  messagesRedis: redisConfigSchema,
  pdvTokenizer: pdvConfigSchema,
});

export type Config = z.TypeOf<typeof configSchema>;

export const configFromEnvironment = envSchema
  .transform(
    (env): Config => ({
      cosmos: {
        accountUri: env.COSMOS__accountEndpoint,
        databaseName: env.COSMOS_DBNAME,
        messagesContainerName: env.COSMOS_MESSAGES_CONTAINER_NAME,
      },
      messageContentStorage: {
        accountUri: env.MESSAGE_CONTENT_STORAGE_URI,
        containerName: env.MESSAGE_CONTENT_CONTAINER_NAME,
      },
      messagesEventHub: {
        connectionUri: env.EVENTHUB_CONNECTION_URI,
        eventHubName: env.MESSAGE_EVENTHUB_NAME,
      },
      messagesRedis: {
        accessKey: env.REDIS_ACCESS_KEY,
        pingInterval: env.REDIS_PING_INTERVAL,
        url: env.REDIS_URL,
      },
      pdvTokenizer: {
        apiKey: env.PDV_TOKENIZER_API_KEY,
        baseUrl: env.PDV_TOKENIZER_BASE_URL,
      },
    }),
  )
  .pipe(configSchema);
