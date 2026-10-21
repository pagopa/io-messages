import { ProblemDetailsSchema } from "@pagopa/hexagonal-core";
import z from "zod";

export const ProblemJsonResponseSchema = ProblemDetailsSchema.extend({
  instance: z.url().optional(),
  status: z.int().min(100).max(599),
});
