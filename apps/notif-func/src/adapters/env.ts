import { z } from "zod";

export const envSchema = z
  .object({
    GCM_MIGRATION_PATH: z.string().min(1),
  })
  .and(z.record(z.string(), z.string()));
