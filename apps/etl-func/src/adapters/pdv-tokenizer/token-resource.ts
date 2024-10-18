import { z } from "zod";

export const tokenResourceSchema = z.object({
  token: z.string().uuid(),
});
export type TokenResource = z.TypeOf<typeof tokenResourceSchema>;
