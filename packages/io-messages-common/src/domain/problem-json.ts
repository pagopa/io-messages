import { z } from "zod";

import { statusCodeSchema } from "./status-code.js";

export const problemJsonSchema = z.object({
  detail: z.string(),
  instance: z.string().url().optional(),
  status: statusCodeSchema,
  title: z.string().optional(),
  type: z.string().url().optional(),
});

export type ProblemJson = z.infer<typeof problemJsonSchema>;
