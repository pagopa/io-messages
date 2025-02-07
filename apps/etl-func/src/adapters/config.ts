import { z } from "zod";

import { applicationInsightsSchema } from "./appinsights/config.js";
import { envSchema } from "./env.js";
import { eventhubConfigSchema } from "./eventhub/config.js";
import { redisConfigSchema } from "./redis/config.js";
import { tableStorageConfigSchema } from "./table-storage/config.js";
import { pdvConfigSchema } from "./tokenizer/config.js";

export const configSchema = z.object({
  appInsights: applicationInsightsSchema,
  cosmos: z.object({
    accountUri: z.string().url(),
    databaseName: z.string().min(1),
    messageStatusContainerName: z.string().min(1),
    messagesContainerName: z.string().min(1),
  }),
  messageContentStorage: z.object({
    accountUri: z.string().url(),
    containerName: z.string().min(1),
  }),
  messageIngestionErrorTable: tableStorageConfigSchema,
  messageStatusErrorTable: tableStorageConfigSchema,
  messageStatusEventHub: eventhubConfigSchema,
  messagesEventHub: eventhubConfigSchema,
  messagesRedis: redisConfigSchema,
  pdvTokenizer: pdvConfigSchema,
});

export type Config = z.TypeOf<typeof configSchema>;

export const configFromEnvironment = envSchema
  .transform(
    (env): Config => ({
      appInsights: {
        connectionString: env.APPINSIGHTS_CONNECTION_STRING,
        samplingPercentage: env.APPINSIGHTS_SAMPLING_PERCENTAGE,
      },
      cosmos: {
        accountUri: env.COSMOS__accountEndpoint,
        databaseName: env.COSMOS_DBNAME,
        messageStatusContainerName: env.COSMOS_MESSAGE_STATUS_CONTAINER_NAME,
        messagesContainerName: env.COSMOS_MESSAGES_CONTAINER_NAME,
      },
      messageContentStorage: {
        accountUri: env.MESSAGE_CONTENT_STORAGE_URI,
        containerName: env.MESSAGE_CONTENT_CONTAINER_NAME,
      },
      messageIngestionErrorTable: {
        connectionUri: env.ACCOUNT_STORAGE__tableServiceUri,
        tableName: env.MESSAGE_ERROR_TABLE_STORAGE_NAME,
      },
      messageStatusErrorTable: {
        connectionUri: env.ACCOUNT_STORAGE__tableServiceUri,
        tableName: env.MESSAGE_STATUS_ERROR_TABLE_STORAGE_NAME,
      },
      messageStatusEventHub: {
        connectionUri: env.EVENTHUB_CONNECTION_URI,
        eventHubName: env.MESSAGE_STATUS_EVENTHUB_NAME,
      },
      messagesEventHub: {
        connectionUri: env.EVENTHUB_CONNECTION_URI,
        eventHubName: env.MESSAGE_EVENTHUB_NAME,
      },
      messagesRedis: {
        password: env.REDIS_PASSWORD,
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
