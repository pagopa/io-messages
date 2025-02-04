import { z } from "zod";

export const tableStorageConfigSchema = z.object({
  connectionUri: z.string().url(),
  tableName: z.string().min(1),
});

export type TableStorageConfigSchema = z.TypeOf<
  typeof tableStorageConfigSchema
>;
