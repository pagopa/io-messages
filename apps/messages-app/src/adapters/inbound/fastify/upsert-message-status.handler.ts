import type { FastifyInstance } from "fastify";

import { ProblemDetailsSchema, defineRoute } from "@pagopa/hexagonal-core";
import { mountFastifyRoute } from "@pagopa/hexagonal-fastify";
import { messageIDSchema } from "io-messages-common/domain/message";
import z from "zod";

import { UpdateMessageStatusUseCase } from "../../../application/use-cases/update-message-status.use-case.js";
import { makeXUserMiddleware } from "./middlewares/x-user.middleware.js";

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

const messageStatusAttributesSchema = z.object({
  is_archived: z.boolean(),
  is_read: z.boolean(),
});

const upsertMessageStatusContract = defineRoute({
  method: "put",
  path: "/api/messages/{id}/status",
  request: {
    body: messageStatusChangeSchema,
    path: z.object({
      id: messageIDSchema,
    }),
  },
  response: {
    200: messageStatusAttributesSchema,
    400: ProblemDetailsSchema,
    403: ProblemDetailsSchema,
    404: ProblemDetailsSchema,
    429: ProblemDetailsSchema,
    500: ProblemDetailsSchema,
  },
});

export const mountUpsertMessageStatusHandler = (
  server: FastifyInstance,
  useCase: UpdateMessageStatusUseCase,
): void => {
  mountFastifyRoute(server, {
    contract: upsertMessageStatusContract,
    inputMapper: (req, user) => {
      const commonInput = {
        fiscalCode: user.fiscal_code,
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
    middlewares: [makeXUserMiddleware()],
    outputMapper: (output) => ({
      is_archived: output.isArchived,
      is_read: output.isRead,
    }),
    useCase,
  });
};
