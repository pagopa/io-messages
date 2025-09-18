import { z } from "zod";

export const lollipopSignatureSchema = z
  .string()
  .regex(/^((sig[0-9]+)=:[A-Za-z0-9+/=]*:(, ?)?)+$/, {
    message: "Invalid lollipop signature format",
  });

export type LollipopSignature = z.infer<typeof lollipopSignatureSchema>;
