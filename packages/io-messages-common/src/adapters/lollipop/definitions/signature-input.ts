import { z } from "zod";

export const signatureInputSchema = z
  .string()
  .regex(/^(?:sig\d+=[^,]*)(?:,\s*(?:sig\d+=[^,]*))*$/);

export type SignatureInput = z.TypeOf<typeof signatureInputSchema>;
