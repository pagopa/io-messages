import { z } from "zod";

export const envSchema = z.object({
  COSMOS__accountEndpoint: z.string().url(),
  COSMOS_DBNAME: z.string().min(1),
  COSMOS_MESSAGE_STATUS_CONTAINER_NAME: z.string().min(1),
  COSMOS_MESSAGES_CONTAINER_NAME: z.string().min(1),
  EVENTHUB_CONNECTION_URI: z.string().min(1),
  MESSAGE_CONTENT_CONTAINER_NAME: z.string().min(1),
  MESSAGE_CONTENT_STORAGE_URI: z.string().url(),
  MESSAGE_EVENTHUB_NAME: z.string().min(1),
  MESSAGE_STATUS_EVENTHUB_NAME: z.string().min(1),
  PDV_TOKENIZER_API_KEY: z.string().min(1),
  PDV_TOKENIZER_BASE_URL: z.string().url(),
  ACCOUNT_STORAGE__queueServiceUri: z.string().url(),
  QUEUE_STORAGE_MESSAGES_ERROR_NAME: z.string().min(1),
  REDIS_PASSWORD: z.string().min(1),
  REDIS_PING_INTERVAL: z.coerce.number(),
  REDIS_URL: z.string().url(),
});
