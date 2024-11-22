import { z } from "zod";

export const envSchema = z.object({
  COSMOSDB_DATABASE_NAME: z.string().min(1),
  COSMOSDB_URI__accountEndpoint: z.string().url(),
  EVENTHUB_CONNECTION_URI: z.string(),
  MESSAGE_CONTENT_CONTAINER_NAME: z.string().min(1),
  MESSAGE_CONTENT_STORAGE_URI: z.string().min(1),
  MESSAGE_EVENTHUB_NAME: z.string().min(1),
  MESSAGES_COSMOSDB_COLLECTION_NAME: z.string().min(1),
  PDV_TOKENIZER_API_KEY: z.string().min(1),
  PDV_TOKENIZER_BASE_URL: z.string().url(),
});
