import * as z from "zod";

export const envSchema = z.object({
  COSMOS_KEY: z.string().min(1),
  COSMOS_URI: z.string().min(1),
  COSMOS_DATABASE_NAME: z.string().min(1),
  STORAGE_ACCOUNT_DELETE_MESSAGES_PATH: z.string().min(1),
  COMMON_STORAGE_ACCOUNT_CONNECTION_STRING: z.string().min(1),
});
