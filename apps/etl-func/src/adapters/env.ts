import { z } from "zod";

export const envSchema = z.object({
  ACCOUNT_STORAGE__tableServiceUri: z.string().url(),
  APPLICATIONINSIGHTS_CONNECTION_STRING: z.string().min(1),
  COMMON_COSMOS__accountEndpoint: z.string().url(),
  COMMON_COSMOS_DBNAME: z.string().min(1),
  COMMON_COSMOS_MESSAGE_STATUS_CONTAINER_NAME: z.string().min(1),
  COMMON_COSMOS_MESSAGES_CONTAINER_NAME: z.string().min(1),
  EVENTHUB_CONNECTION_URI: z.string().min(1),
  IOCOM_COSMOS__accountEndpoint: z.string().url(),
  IOCOM_COSMOS_EVENTS_COLLECTOR_DBNAME: z.string().min(1),
  IOCOM_COSMOS_INGESTION_SUMMARY_COLLECTION_NAME: z.string().min(1),
  MESSAGE_CONTENT_CONTAINER_NAME: z.string().min(1),
  MESSAGE_CONTENT_STORAGE_URI: z.string().url(),
  MESSAGE_ERROR_TABLE_STORAGE_NAME: z.string().min(1),
  MESSAGE_EVENTHUB_NAME: z.string().min(1),
  MESSAGE_STATUS_ERROR_TABLE_STORAGE_NAME: z.string().min(1),
  MESSAGE_STATUS_EVENTHUB_NAME: z.string().min(1),
  MESSAGES_INGESTION_LEASE_CONTAINER: z.string().min(1),
  MESSAGES_INGESTION_LEASE_CONTAINER_PREFIX: z.string().min(1),
  MESSAGES_INGESTION_RETRY_MAX_INVOCATION_ITEMS: z.coerce.number().int(),
  MESSAGES_INGESTION_RETRY_MAX_MINUTES_INTERVAL: z.coerce.number().int(),
  MESSAGES_INGESTION_RETRY_MAX_RETRIES_COUNT: z.coerce.number().int(),
  MESSAGES_INGESTION_RETRY_MIN_MINUTES_INTERVAL: z.coerce.number().int(),
  PDV_TOKENIZER_API_KEY: z.string().min(1),
  PDV_TOKENIZER_BASE_URL: z.string().url(),
  REDIS_PASSWORD: z.string().min(1),
  REDIS_PING_INTERVAL: z.coerce.number(),
  REDIS_URL: z.string().url(),
});
