import type { FastifyInstance } from "fastify";

import { ProblemDetailsSchema, defineRoute } from "@pagopa/hexagonal-core";
import { mountFastifyRoute } from "@pagopa/hexagonal-fastify";
import z from "zod";

import { GetMessageUseCase } from "../../../application/use-cases/get-message.use-case.js";
import {
  GetMessageResponseSchema,
  toGetMessageResponse,
} from "./dto/get-message.dto.js";
import { makeXUserMiddleware } from "./middlewares/x-user.middleware.js";

const getMessageContract = defineRoute({
  method: "get",
  path: "/api/messages/{id}",
  request: {
    path: z.object({
      id: z.string().min(1),
    }),
    query: z.object({
      public_message: z
        .enum(["true", "false"])
        .transform((value) => value === "true")
        .default(false),
    }),
  },
  response: {
    200: GetMessageResponseSchema,
    400: ProblemDetailsSchema,
    404: ProblemDetailsSchema,
    429: ProblemDetailsSchema,
    500: ProblemDetailsSchema,
  },
});

export const mountGetMessageHandler = (
  server: FastifyInstance,
  useCase: GetMessageUseCase,
): void => {
  mountFastifyRoute(server, {
    contract: getMessageContract,
    inputMapper: (req, user) => ({
      fiscalCode: user.fiscal_code,
      messageId: req.path.id,
      publicMessage: req.query.public_message,
    }),
    middlewares: [makeXUserMiddleware()],
    outputMapper: toGetMessageResponse,
    useCase,
  });
};
