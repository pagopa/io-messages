import * as z from "zod";

export const envSchema = z.object({
  COM_STORAGE_ACCOUNT__serviceUri: z.string().url(),
  COMMON_STORAGE_ACCOUNT_URL: z.string().url(),
  COSMOS_DATABASE_NAME: z.string().min(1),
  COSMOS_URI: z.string().min(1),
});
