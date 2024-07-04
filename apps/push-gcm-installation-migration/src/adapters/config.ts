import * as z from "zod";

export const configSchema = z.object({
  notificationHub: z.object({
    partition1: z.object({
      connectionString: z.string().min(1),
      name: z.string().min(1),
    }),
    partition2: z.object({
      connectionString: z.string().min(1),
      name: z.string().min(1),
    }),
    partition3: z.object({
      connectionString: z.string().min(1),
      name: z.string().min(1),
    }),
    partition4: z.object({
      connectionString: z.string().min(1),
      name: z.string().min(1),
    }),
  }),
  storage: z.object({
    gcmMigration: z.object({
      containerName: z.string().min(1),
    }),
  }),
});
