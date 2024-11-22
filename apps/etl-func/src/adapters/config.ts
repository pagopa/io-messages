import { z } from "zod";

import { envSchema } from "./env.js";
import { eventhubConfigSchema } from "./eventhub/config.js";

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
  pdvTokenizer: z.object({
    apiKey: z.string().min(1),
    baseUrl: z.string().url(),
  }),
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
      pdvTokenizer: {
        apiKey: env.PDV_TOKENIZER_API_KEY,
        baseUrl: env.PDV_TOKENIZER_BASE_URL,
      },
    }),
  )
  .pipe(configSchema);
