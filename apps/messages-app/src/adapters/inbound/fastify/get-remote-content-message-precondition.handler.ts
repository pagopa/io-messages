import type { FastifyInstance } from "fastify";

import { defineRoute } from "@pagopa/hexagonal-core";
import { mountFastifyRoute } from "@pagopa/hexagonal-fastify";
import { lollipopRequestHeadersSchema } from "io-messages-common/adapters/lollipop/definitions/request-headers";
import z from "zod";

import type { GetRemoteContentMessagePreconditionUseCase } from "../../../application/use-cases/get-remote-content-message-precondition.use-case.js";

import {
  GetRemoteContentMessagePreconditionResponseSchema,
  ProblemJsonResponseSchema,
  toGetRemoteContentMessagePreconditionResponse,
} from "./dto/get-remote-content-message-precondition.dto.js";
import { makeXUserMiddleware } from "./middlewares/x-user.middleware.js";

const getRemoteContentMessagePreconditionContract = defineRoute({
  method: "get",
  path: "/api/communication/v1/third-party-messages/{id}/precondition",
  request: {
    // Completeness is enforced by the use case, only when the RC configuration requires lollipop.
    headers: lollipopRequestHeadersSchema.partial(),
    path: z.object({
      id: z.ulid(),
    }),
  },
  response: {
    200: GetRemoteContentMessagePreconditionResponseSchema,
    400: ProblemJsonResponseSchema,
    403: ProblemJsonResponseSchema,
    404: ProblemJsonResponseSchema,
    429: ProblemJsonResponseSchema,
    500: ProblemJsonResponseSchema,
  },
});

export const mountGetRemoteContentMessagePreconditionHandler = (
  server: FastifyInstance,
  useCase: GetRemoteContentMessagePreconditionUseCase,
): void => {
  mountFastifyRoute(server, {
    contract: getRemoteContentMessagePreconditionContract,
    inputMapper: (request, userIdentity) => ({
      assertionRef: userIdentity.assertion_ref,
      fiscalCode: userIdentity.fiscal_code,
      lollipopRequestHeaders: lollipopRequestHeadersSchema.safeParse(
        request.headers,
      ).data,
      messageId: request.path.id,
    }),
    middlewares: [makeXUserMiddleware()],
    outputMapper: toGetRemoteContentMessagePreconditionResponse,
    useCase,
  });
};
