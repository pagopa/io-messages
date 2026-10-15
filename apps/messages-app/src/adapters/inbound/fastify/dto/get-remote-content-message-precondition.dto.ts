import type { RemoteContentMessagePrecondition } from "io-messages-common/domain/remote-content-message-precondition";

import { ProblemDetailsSchema } from "@pagopa/hexagonal-core";
import z from "zod";

export const ProblemJsonResponseSchema = ProblemDetailsSchema.extend({
  instance: z.url().optional(),
  status: z.number().int().min(100).max(599),
});

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
