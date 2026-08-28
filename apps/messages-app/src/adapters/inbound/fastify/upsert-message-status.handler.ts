import type { FastifyInstance } from "fastify";

import {
  FiscalCodeSchema,
  ProblemDetailsSchema,
  defineRoute,
} from "@pagopa/hexagonal-core";
import { mountFastifyRoute } from "@pagopa/hexagonal-fastify";
import z from "zod";

import { messageStatusValueSchema } from "../../../application/ports/message-status.js";
import { UpdateMessageStatusUseCase } from "../../../application/use-cases/update-message-status.use-case.js";

const messageStatusChangeSchema = z.discriminatedUnion("change_type", [
  z.object({
    change_type: z.literal("reading"),
    is_read: z.literal(true),
  }),
  z.object({
    change_type: z.literal("archiving"),
    is_archived: z.boolean(),
  }),
  z.object({
    change_type: z.literal("bulk"),
    is_archived: z.boolean(),
    is_read: z.literal(true).optional(),
  }),
]);

const messageStatusWithAttributesSchema = z.object({
  is_archived: z.boolean(),
  is_read: z.boolean(),
  status: messageStatusValueSchema,
  updated_at: z.string(),
  version: z.int().nonnegative(),
});

const upsertMessageStatusContract = defineRoute({
  method: "put",
  path: "/api/messages/{fiscal_code}/{id}/message-status",
  request: {
    body: messageStatusChangeSchema,
    path: z.object({
      fiscal_code: FiscalCodeSchema,
      id: z.string().min(1),
    }),
  },
  response: {
    200: messageStatusWithAttributesSchema,
    400: ProblemDetailsSchema,
    403: ProblemDetailsSchema,
    404: ProblemDetailsSchema,
    500: ProblemDetailsSchema,
  },
});

export const mountUpsertMessageStatusHandler = (
  server: FastifyInstance,
  useCase: UpdateMessageStatusUseCase,
): void => {
  mountFastifyRoute(server, {
    contract: upsertMessageStatusContract,
    inputMapper: (req) => {
      const commonInput = {
        fiscalCode: req.path.fiscal_code,
        messageId: req.path.id,
      };

      switch (req.body.change_type) {
        case "reading":
          return { ...commonInput, isRead: req.body.is_read };
        case "archiving":
          return { ...commonInput, isArchived: req.body.is_archived };
        case "bulk":
          return {
            ...commonInput,
            isArchived: req.body.is_archived,
            isRead: req.body.is_read,
          };
      }
    },
    outputMapper: (output) => ({
      is_archived: output.isArchived,
      is_read: output.isRead,
      status: output.status,
      updated_at: output.updatedAt,
      version: output.version,
    }),
    useCase,
  });
};
