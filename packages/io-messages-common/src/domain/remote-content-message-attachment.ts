import { z } from "zod";

export const remoteContentAttachmentUrlSchema = z.string().min(1);
export type RemoteContentAttachmentUrl = z.infer<
  typeof remoteContentAttachmentUrlSchema
>;

export const remoteContentMessageAttachmentSchema = z.instanceof(Buffer);
export type RemoteContentMessageAttachment = z.infer<
  typeof remoteContentMessageAttachmentSchema
>;
