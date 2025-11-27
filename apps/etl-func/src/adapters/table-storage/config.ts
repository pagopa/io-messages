import { z } from "zod";

export const tableStorageConfigSchema = z.object({
  connectionUri: z.url(),
  tableName: z.string().min(1),
});

export const tableStorageDevConfigSchema = z.object({
  connectionString: z.string().min(1),
  tableName: z.string().min(1),
});

export type TableStorageConfigSchema = z.TypeOf<
  typeof tableStorageConfigSchema
>;
