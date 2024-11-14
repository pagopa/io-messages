import { z } from "zod";

export const envSchema = z.object({
  EVENTHUB_CONNECTION_URI: z.string().url(),
  MESSAGE_CONTENT_CONTAINER_NAME: z.string().min(1),
  MESSAGE_CONTENT_STORAGE_URI: z.string().min(1),
  MESSAGE_EVENTHUB_NAME: z.string().min(1),
  PDV_TOKENIZER_API_KEY: z.string().min(1),
  PDV_TOKENIZER_BASE_URL: z.string().url(),
});
