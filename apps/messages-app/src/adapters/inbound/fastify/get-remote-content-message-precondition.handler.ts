import type { FastifyInstance } from "fastify";

import { ProblemDetailsSchema, defineRoute } from "@pagopa/hexagonal-core";
import { mountFastifyRoute } from "@pagopa/hexagonal-fastify";
import { lollipopRequestHeadersSchema } from "io-messages-common/adapters/lollipop/definitions/request-headers";
import { remoteContentMessagePreconditionSchema } from "io-messages-common/domain/remote-content-message-precondition";
import z from "zod";

import type { GetRemoteContentMessagePreconditionUseCase } from "../../../application/use-cases/get-remote-content-message-precondition.use-case.js";

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
    200: remoteContentMessagePreconditionSchema,
    400: ProblemDetailsSchema,
    403: ProblemDetailsSchema,
    404: ProblemDetailsSchema,
    429: ProblemDetailsSchema,
    500: ProblemDetailsSchema,
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
    useCase,
  });
};
