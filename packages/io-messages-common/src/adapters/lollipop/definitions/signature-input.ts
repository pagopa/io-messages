import { z } from "zod";

export const lollipopSignatureInputSchema = z
  .string()
  .regex(/^(?:sig\d+=[^,]*)(?:,\s*(?:sig\d+=[^,]*))*$/);

export type LollipopSignatureInput = z.infer<
  typeof lollipopSignatureInputSchema
>;
