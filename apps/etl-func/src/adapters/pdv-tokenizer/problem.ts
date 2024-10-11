import { z } from "zod";

// Define the InvalidParam schema
const invalidParamSchema = z.object({
  name: z.string(),
  reason: z.string(),
});

// Define the Problem schema
export const problemSchema = z.object({
  detail: z.string().optional(),
  instance: z.string().optional(),
  invalidParams: z.array(invalidParamSchema).optional(),
  status: z.number().int(),
  title: z.string(),
  type: z.string().optional(),
});

// Type inference from the Zod schema
export type Problem = z.infer<typeof problemSchema>;
export type InvalidParam = z.infer<typeof invalidParamSchema>;
