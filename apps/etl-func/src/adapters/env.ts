import { z } from "zod";

const common = z.object({
  // Application Insights
  APPLICATIONINSIGHTS_CONNECTION_STRING: z.string().min(1),
  // Redis
  REDIS_PING_INTERVAL: z.coerce.number(),
  REDIS_URL: z.string().url(),
  REDIS_PASSWORD: z.string().min(1),
  // Tokenizer
  PDV_TOKENIZER_API_KEY: z.string().min(1),
  PDV_TOKENIZER_BASE_URL: z.string().url(),
  // Azure Storage
  // -- Table
  ACCOUNT_STORAGE__tableServiceUri: z.string().url(),
  MESSAGE_STATUS_ERROR_TABLE_STORAGE_NAME: z.string().min(1),
  MESSAGE_ERROR_TABLE_STORAGE_NAME: z.string().min(1),
  // -- Blob
  MESSAGE_CONTENT_CONTAINER_NAME: z.string().min(1),
  MESSAGE_CONTENT_STORAGE_URI: z.string().url(),
  // CosmosDB
  // -- cosmos-api
  COMMON_COSMOS__accountEndpoint: z.string().url(),
  COMMON_COSMOS_DBNAME: z.string().min(1),
  COMMON_COSMOS_MESSAGE_STATUS_CONTAINER_NAME: z.string().min(1),
  COMMON_COSMOS_MESSAGES_CONTAINER_NAME: z.string().min(1),
  // -- com-cosno-01
  IOCOM_COSMOS__accountEndpoint: z.string().url(),
  IOCOM_COSMOS_EVENTS_COLLECTOR_DBNAME: z.string().min(1),
  IOCOM_COSMOS_INGESTION_SUMMARY_COLLECTION_NAME: z.string().min(1),
});

export const envSchema = common.and(
  z.discriminatedUnion("NODE_ENV", [
    z.object({
      NODE_ENV: z.literal("production"),
      // Eventhubs
      EVENTHUB_CONNECTION_URI: z.string().min(1),
      MESSAGE_EVENTHUB_NAME: z.string().min(1),
      MESSAGE_STATUS_EVENTHUB_NAME: z.string().min(1),
    }),
    z.object({
      NODE_ENV: z.literal("development"),
      EVENTHUB_CONNECTION_STRING: z.string(),
    }),
  ]),
);

export type Env = z.TypeOf<typeof envSchema>;
