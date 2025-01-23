import { z } from "zod";

export const envSchema = z.object({
  COSMOS__accountEndpoint: z.string().url(),
  COSMOS_DBNAME: z.string().min(1),
  COSMOS_MESSAGE_STATUS_CONTAINER_NAME: z.string().min(1),
  IOCOM_COSMOS__accountEndpoint: z.string().url(),
  IOCOM_COSMOS_EVENTS_COLLECTOR_DBNAME: z.string().min(1),
  IOCOM_COSMOS_INGESTION_SUMMARY_COLLECTION_NAME: z.string().min(1),
  COSMOS_MESSAGES_CONTAINER_NAME: z.string().min(1),
  EVENTHUB_CONNECTION_URI: z.string().min(1),
  MESSAGE_CONTENT_CONTAINER_NAME: z.string().min(1),
  MESSAGE_CONTENT_STORAGE_URI: z.string().url(),
  MESSAGE_EVENTHUB_NAME: z.string().min(1),
  MESSAGE_STATUS_EVENTHUB_NAME: z.string().min(1),
  PDV_TOKENIZER_API_KEY: z.string().min(1),
  PDV_TOKENIZER_BASE_URL: z.string().url(),
  REDIS_PASSWORD: z.string().min(1),
  REDIS_PING_INTERVAL: z.coerce.number(),
  REDIS_URL: z.string().url(),
});
