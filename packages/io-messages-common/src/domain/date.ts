import { z } from "zod";

export const dateStringSchema = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/);

export type DateString = z.infer<typeof dateStringSchema>;
