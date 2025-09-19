import { z } from "zod";

export const thumbprintSchema = z.union([
  z.string().regex(/^([A-Za-z0-9-_=]{1,44})$/),
  z.string().regex(/^([A-Za-z0-9-_=]{1,66}$)/),
  z.string().regex(/^([A-Za-z0-9-_=]{1,88}$)/),
]);

export type Thumbprint = z.infer<typeof thumbprintSchema>;
