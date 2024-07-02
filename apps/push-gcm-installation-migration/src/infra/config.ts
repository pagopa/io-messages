import * as z from "zod";

export const configSchema = z.object({
  storage: z.object({
    gcmMigration: z.object({
      containerName: z.string().min(1),
    }),
  }),
});
