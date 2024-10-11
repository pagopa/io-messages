import { z } from "zod";

export const piiResourceSchema = z.object({ pii: z.string().min(1) });
export type PiiResource = z.TypeOf<typeof piiResourceSchema>;
