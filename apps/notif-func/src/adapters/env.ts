import { z } from "zod";

export const envSchema = z
  .object({
    APPLICATIONINSIGHTS_CONNECTION_STRING: z.string().min(1),
    GCM_MIGRATION_PATH: z.string().min(1),
    GCM_MIGRATION_QUEUE_NAME: z.string().min(1),
  })
  .and(z.record(z.string(), z.string()));
