import type { RemoteContentMessagePrecondition } from "io-messages-common/domain/remote-content-message-precondition";

import z from "zod";

export { ProblemJsonResponseSchema } from "./problem-json.dto.js";

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
