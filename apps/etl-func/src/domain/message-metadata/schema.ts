import * as z from "zod";
export const messageMetadataSchema = z.object({
  createdAt: z.string(),
  featureLevelType: z.enum(["ADVANCED", "STANDARD"]).default("STANDARD"),
  fiscalCode: z.string().min(1),
  indexedId: z.string().ulid()

  id: z.string().ulid(),
});
export type MessageMetadata = z.TypeOf<typeof messageMetadataSchema>;
