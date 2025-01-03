import { z } from "zod";

export const pdvConfigSchema = z.object({
  apiKey: z.string().min(1),
  baseUrl: z.string().url(),
});

export type PDVConfig = z.TypeOf<typeof pdvConfigSchema>;
