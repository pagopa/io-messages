import type { FastifyInstance } from "fastify";

import {
  ForbiddenError,
  GenericError,
  NotFoundError,
  ProblemDetailsSchema,
  TooManyRequestsError,
  ValidationError,
  defineRoute,
} from "@pagopa/hexagonal-core";
import { lollipopRequestHeadersSchema } from "io-messages-common/adapters/lollipop/definitions/request-headers";
import { messageIDSchema } from "io-messages-common/domain/message";
import z from "zod";

import { LollipopHeadersBuildError } from "../../../application/ports/lc-params.js";
import { RemoteContentMessageBadGatewayError } from "../../../application/ports/remote-content-message.js";
import { GetRemoteContentMessageUseCase } from "../../../application/use-cases/get-remote-content-message.use-case.js";
import {
  GetRemoteContentMessageResponseSchema,
  toGetRemoteContentMessageResponse,
} from "./dto/get-remote-content-message.dto.js";
import { makeXUserMiddleware } from "./middlewares/x-user.middleware.js";
import {
  HttpRouteOutput,
  mountFastifyHttpResultRoute,
} from "./mount-fastify-http-result-route.js";

const lollipopRequestHeadersInputSchema =
  lollipopRequestHeadersSchema.partial();

const getRemoteContentMessageContract = defineRoute({
  method: "get",
  path: "/api/v1/third-party-messages/{id}",
  request: {
    headers: lollipopRequestHeadersInputSchema,
    path: z.object({
      id: messageIDSchema,
    }),
  },
  response: {
    200: GetRemoteContentMessageResponseSchema,
    400: ProblemDetailsSchema,
    403: ProblemDetailsSchema,
    404: ProblemDetailsSchema,
    429: ProblemDetailsSchema,
    500: ProblemDetailsSchema,
    502: ProblemDetailsSchema,
  },
});

type GetRemoteContentMessageHttpErrorOutput =
  | HttpRouteOutput<400, z.infer<typeof ProblemDetailsSchema>>
  | HttpRouteOutput<403, z.infer<typeof ProblemDetailsSchema>>
  | HttpRouteOutput<404, z.infer<typeof ProblemDetailsSchema>>
  | HttpRouteOutput<429, z.infer<typeof ProblemDetailsSchema>>
  | HttpRouteOutput<500, z.infer<typeof ProblemDetailsSchema>>
  | HttpRouteOutput<502, z.infer<typeof ProblemDetailsSchema>>;

const problem = (
  status: GetRemoteContentMessageHttpErrorOutput["status"],
  title: string,
  detail: string,
): GetRemoteContentMessageHttpErrorOutput => ({
  body: { detail, status, title, type: "about:blank" },
  status,
});

const toGetRemoteContentMessageHttpErrorOutput = (
  error: Error,
): GetRemoteContentMessageHttpErrorOutput => {
  if (error instanceof ValidationError) {
    return problem(400, "Bad Request", error.message);
  }

  if (error instanceof ForbiddenError) {
    return problem(403, "Forbidden", error.message);
  }

  if (error instanceof NotFoundError) {
    return problem(404, "Not Found", error.message);
  }

  if (error instanceof TooManyRequestsError) {
    return problem(429, "Too Many Requests", error.message);
  }

  if (error instanceof RemoteContentMessageBadGatewayError) {
    return problem(502, "Bad Gateway", `Bad Gateway: ${error.detail}`);
  }

  if (error instanceof LollipopHeadersBuildError) {
    return problem(500, "Internal server error", error.detail);
  }

  if (error instanceof GenericError) {
    return problem(500, "Internal server error", error.message);
  }

  return problem(500, "Internal server error", "Unexpected error");
};

export const mountGetRemoteContentMessageHandler = (
  server: FastifyInstance,
  useCase: GetRemoteContentMessageUseCase,
): void => {
  mountFastifyHttpResultRoute(server, {
    contract: getRemoteContentMessageContract,
    errorMapper: toGetRemoteContentMessageHttpErrorOutput,
    inputMapper: (request, user) => ({
      assertionRef: user.assertion_ref,
      fiscalCode: user.fiscal_code,
      lollipopRequestHeaders:
        Object.keys(request.headers).length > 0
          ? lollipopRequestHeadersInputSchema.parse(request.headers)
          : undefined,
      messageId: request.path.id,
    }),
    middlewares: [makeXUserMiddleware()] as const,
    outputMapper: toGetRemoteContentMessageResponse,
    useCase,
  });
};
