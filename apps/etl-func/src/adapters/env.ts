import { z } from "zod";

const common = z.object({
  // -- Table
  ACCOUNT_STORAGE__tableServiceUri: z.url(),
  // Application Insights
  APPLICATIONINSIGHTS_CONNECTION_STRING: z.string().min(1),
  // -- cosmos-api
  COMMON_COSMOS__accountEndpoint: z.url(),
  COMMON_COSMOS_DBNAME: z.string().min(1),
  COMMON_COSMOS_MESSAGE_STATUS_CONTAINER_NAME: z.string().min(1),
  COMMON_COSMOS_MESSAGES_CONTAINER_NAME: z.string().min(1),
  // -- com-cosno-01
  IOCOM_COSMOS__accountEndpoint: z.url(),
  IOCOM_COSMOS_EVENTS_COLLECTOR_DBNAME: z.string().min(1),
  IOCOM_COSMOS_INGESTION_SUMMARY_COLLECTION_NAME: z.string().min(1),
  // -- Blob
  MESSAGE_CONTENT_CONTAINER_NAME: z.string().min(1),
  // CosmosDB
  MESSAGE_ERROR_TABLE_STORAGE_NAME: z.string().min(1),
  MESSAGE_STATUS_ERROR_TABLE_STORAGE_NAME: z.string().min(1),
  // Tokenizer
  PDV_TOKENIZER_API_KEY: z.string().min(1),
  PDV_TOKENIZER_BASE_URL: z.url(),
  REDIS_PASSWORD: z.string().min(1),
  // Redis
  REDIS_PING_INTERVAL: z.coerce.number(),
  REDIS_URL: z.url(),
});

export const envSchema = common.and(
  z.discriminatedUnion("NODE_ENV", [
    z.object({
      // Eventhubs
      EVENTHUB_CONNECTION_URI: z.string().min(1),
      IOCOM_STORAGE_URI: z.url(),
      //storage
      MESSAGE_CONTENT_STORAGE_URI: z.url(),
      MESSAGE_EVENTHUB_NAME: z.string().min(1),
      MESSAGE_STATUS_EVENTHUB_NAME: z.string().min(1),
      NODE_ENV: z.literal("production"),
    }),
    z.object({
      EVENTHUB_CONNECTION_STRING: z.string(),
      IOCOM_STORAGE_CONNECTION_STRING: z.string().min(1),
      //storage
      MESSAGE_CONTENT_STORAGE_CONNECTION_STRING: z.string().min(1),
      MESSAGE_ERROR_TABLE_STORAGE_CONENCTION_STRING: z.string().min(1),
      MESSAGE_EVENTHUB_NAME: z.string().min(1),
      MESSAGE_STATUS_EVENTHUB_NAME: z.string().min(1),
      NODE_ENV: z.literal("development"),
    }),
  ]),
);

export type Env = z.TypeOf<typeof envSchema>;
