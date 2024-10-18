import { z } from "zod";

export const envSchema = z
  .object({
    PDV_TOKENIZER_API_KEY: z.string().min(1),
    PDV_TOKENIZER_BASE_URL: z.string().min(1),
  })
  .and(z.record(z.string(), z.string()));
