import { z } from "zod";

export const storageAccountConfigSchema = z.discriminatedUnion("authStrategy", [
  z.object({
    authStrategy: z.literal("Identity"),
    connectionUri: z.string().url(),
    containerName: z.string().min(1),
  }),
  z.object({
    authStrategy: z.literal("ConnectionString"),
    connectionString: z.string().min(1),
    containerName: z.string().min(1),
  }),
]);

export type StorageAccountConfig = z.TypeOf<typeof storageAccountConfigSchema>;
