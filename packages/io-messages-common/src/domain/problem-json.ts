import { z } from "zod";

export const problemJsonSchema = z.object({
  detail: z.string(),
  instance: z.string().url().optional(),
  status: z.number().int().min(100).max(599),
  title: z.string().optional(),
  type: z.string().url().optional(),
});

export type ProblemJson = z.infer<typeof problemJsonSchema>;
