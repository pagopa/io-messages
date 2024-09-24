import { z } from "zod";

export const envSchema = z
  .object({
    APPLICATIONINSIGHTS_CONNECTION_STRING: z.string().min(1),
  })
  .and(z.record(z.string(), z.string()));
