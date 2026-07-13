import type { FastifyInstance } from "fastify";

import {
  FiscalCodeSchema,
  ProblemDetailsSchema,
  defineRoute,
} from "@pagopa/hexagonal-core";
import { mountFastifyRoute } from "@pagopa/hexagonal-fastify";
import z from "zod";

import { GetMessagesByUserUseCase } from "../../../application/use-cases/get-user-messages.use-case.js";
import {
  PaginatedPublicMessagesCollectionSchema,
  toPublicMessage,
} from "./dto/get-messages.dto.js";

const getMessagesByUserContract = defineRoute({
  method: "get",
  operationId: "getMessagesByUser",
  path: "/api/messages/{fiscal_code}",
  request: {
    path: z.object({
      fiscal_code: FiscalCodeSchema,
    }),
    query: z.object({
      archived: z
        .enum(["true", "false"])
        .transform((val) => val === "true")
        .default(false),
      maximum_id: z.string().optional(),
      minimum_id: z.string().optional(),
      page_size: z.coerce.number().int().min(1).max(100).default(12),
    }),
  },
  response: {
    200: PaginatedPublicMessagesCollectionSchema,
    400: ProblemDetailsSchema,
    429: ProblemDetailsSchema,
    500: ProblemDetailsSchema,
  },
});

export const mountGetMessagesByUserHandler = (
  server: FastifyInstance,
  useCase: GetMessagesByUserUseCase,
): void => {
  mountFastifyRoute(server, {
    contract: getMessagesByUserContract,
    inputMapper: (req) => ({
      archived: req.query.archived,
      fiscalCode: req.path.fiscal_code,
      maximumID: req.query.maximum_id,
      minimumID: req.query.minimum_id,
      pageSize: req.query.page_size,
    }),
    outputMapper: (output) => ({
      items: output.items.map(toPublicMessage),
      next: output.next,
      prev: output.prev,
    }),
    useCase,
  });
};
