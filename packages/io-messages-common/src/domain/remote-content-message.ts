import { z } from "zod";

const remoteContentAttachmentSchema = z.object({
  category: z.preprocess(
    (value) => value ?? "DOCUMENT",
    z
      .string()
      .regex(/[A-Z0-9_]+/)
      .optional(),
  ),
  content_type: z.string().min(1).optional(),
  id: z.string().min(1),
  name: z.string().min(1).optional(),
  url: z.string().min(1),
});

export const remoteContentMessageSchema = z.object({
  attachments: z.array(remoteContentAttachmentSchema).readonly().optional(),
  details: z.record(z.string(), z.any()).optional(),
});

export type RemoteContentMessage = z.infer<typeof remoteContentMessageSchema>;
