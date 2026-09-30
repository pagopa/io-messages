import { z } from "zod";

export const remoteContentMessagePreconditionSchema = z.object({
  markdown: z.string(),
  title: z.string(),
});

export type RemoteContentMessagePrecondition = z.infer<
  typeof remoteContentMessagePreconditionSchema
>;
