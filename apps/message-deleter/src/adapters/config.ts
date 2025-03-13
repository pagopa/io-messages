import * as z from "zod";

export const envSchema = z.object({
  COSMOS_KEY: z.string().min(1),
  COSMOS_URI: z.string().min(1),
  STORAGE_ACCOUNT_CONNECTION_STRING: z.string().min(1),
});
