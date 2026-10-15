import type { RemoteContentMessagePrecondition } from "io-messages-common/domain/remote-content-message-precondition";

import z from "zod";

export const GetRemoteContentMessagePreconditionResponseSchema = z.object({
  markdown: z.string(),
  title: z.string(),
});

export type GetRemoteContentMessagePreconditionResponse = z.infer<
  typeof GetRemoteContentMessagePreconditionResponseSchema
>;

export const toGetRemoteContentMessagePreconditionResponse = (
  precondition: RemoteContentMessagePrecondition,
): GetRemoteContentMessagePreconditionResponse => precondition;
