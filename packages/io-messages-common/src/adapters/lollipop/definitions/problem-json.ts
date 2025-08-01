import { z } from "zod";

export const problemJsonSchema = z.object({
  detail: z.string(),
  instance: z.string().url(),
  status: z.number().int().min(100).max(599),
  title: z.string(),
  type: z.string().url(),
});

export type ProblemJson = z.TypeOf<typeof problemJsonSchema>;
