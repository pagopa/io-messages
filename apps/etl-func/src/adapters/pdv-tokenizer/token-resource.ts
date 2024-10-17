import { z } from "zod";

export const tokenResourceSchema = z.object({
  token: z.string().uuid().min(1),
});
export type TokenResource = z.TypeOf<typeof tokenResourceSchema>;
