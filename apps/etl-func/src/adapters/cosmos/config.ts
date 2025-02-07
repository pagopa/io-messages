import { z } from "zod";

export const cosmosConfigSchema = z.object({
  accountUri: z.string().url(),
  databaseName: z.string().min(1),
  messageIngestionSummaryCollectionName: z.string().min(1),
});

export type cosmosConfigSchema = z.TypeOf<typeof cosmosConfigSchema>;
