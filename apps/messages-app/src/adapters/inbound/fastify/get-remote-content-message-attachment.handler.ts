import type { FastifyInstance } from "fastify";

import {
  ForbiddenError,
  GenericError,
  NotFoundError,
  ServiceUnavailableError,
  TooManyRequestsError,
  ValidationError,
  defineRoute,
} from "@pagopa/hexagonal-core";
import { lollipopRequestHeadersSchema } from "io-messages-common/adapters/lollipop/definitions/request-headers";
import { messageIDSchema } from "io-messages-common/domain/message";
import { remoteContentAttachmentUrlSchema } from "io-messages-common/domain/remote-content-message-attachment";
import z from "zod";

import type { GetRemoteContentMessageAttachmentUseCase } from "../../../application/use-cases/get-remote-content-message-attachment.use-case.js";

import { LollipopHeadersBuildError } from "../../../application/ports/lc-params.js";
import {
  RemoteContentAttachmentUnsupportedMediaTypeError,
  RemoteContentServiceUnavailableError,
} from "../../../application/ports/remote-content-message-attachment.js";
import { ProblemJsonResponseSchema } from "./dto/get-remote-content-message-attachment.dto.js";
import { makeXUserMiddleware } from "./middlewares/x-user.middleware.js";
import {
  HttpRouteOutput,
  mountFastifyHttpResultRoute,
} from "./mount-fastify-http-result-route.js";

const getRemoteContentMessageAttachmentContract = defineRoute({
  method: "get",
  path: "/api/messages/third-party-messages/{id}/attachments/*",
  request: {
    headers: lollipopRequestHeadersSchema.partial(),
    path: z.object({
      "*": remoteContentAttachmentUrlSchema,
      id: messageIDSchema,
    }),
    query: z.object({}).passthrough(),
  },
  response: {
    200: z.instanceof(Buffer),
    400: ProblemJsonResponseSchema,
    403: ProblemJsonResponseSchema,
    404: ProblemJsonResponseSchema,
    415: ProblemJsonResponseSchema,
    429: ProblemJsonResponseSchema,
    500: ProblemJsonResponseSchema,
    503: ProblemJsonResponseSchema,
  },
});

type GetRemoteContentMessageAttachmentHttpError =
  | HttpRouteOutput<400, z.infer<typeof ProblemJsonResponseSchema>>
  | HttpRouteOutput<403, z.infer<typeof ProblemJsonResponseSchema>>
  | HttpRouteOutput<404, z.infer<typeof ProblemJsonResponseSchema>>
  | HttpRouteOutput<415, z.infer<typeof ProblemJsonResponseSchema>>
  | HttpRouteOutput<429, z.infer<typeof ProblemJsonResponseSchema>>
  | HttpRouteOutput<500, z.infer<typeof ProblemJsonResponseSchema>>
  | HttpRouteOutput<503, z.infer<typeof ProblemJsonResponseSchema>>;

const problem = (
  status: GetRemoteContentMessageAttachmentHttpError["status"],
  title: string,
  detail: string,
  headers?: Readonly<Record<string, string>>,
): GetRemoteContentMessageAttachmentHttpError => ({
  body: { detail, status, title, type: "about:blank" },
  headers,
  status,
});

const toGetRemoteContentMessageAttachmentHttpError = (
  error: Error,
): GetRemoteContentMessageAttachmentHttpError => {
  if (error instanceof ValidationError) {
    return problem(400, "Bad Request", error.message);
  }

  if (error instanceof ForbiddenError) {
    return problem(403, "Forbidden", error.message);
  }

  if (error instanceof NotFoundError) {
    return problem(404, "Not Found", error.message);
  }

  if (error instanceof RemoteContentAttachmentUnsupportedMediaTypeError) {
    return problem(415, "Unsupported Media Type", error.detail);
  }

  if (error instanceof TooManyRequestsError) {
    return problem(429, "Too Many Requests", error.message);
  }

  if (error instanceof RemoteContentServiceUnavailableError) {
    return problem(
      503,
      "Service Unavailable",
      error.message,
      error.retryAfter ? { "Retry-After": error.retryAfter } : undefined,
    );
  }

  if (error instanceof LollipopHeadersBuildError) {
    return problem(500, "Internal server error", error.detail);
  }

  if (error instanceof GenericError) {
    return problem(500, "Internal server error", error.message);
  }

  if (error instanceof ServiceUnavailableError) {
    return problem(503, "Service Unavailable", error.message);
  }

  return problem(500, "Internal server error", "Unexpected error");
};

const toAttachmentUrl = (
  path: string,
  query: Record<string, unknown>,
): string => {
  const searchParams = new URLSearchParams();
  for (const [name, value] of Object.entries(query)) {
    for (const queryValue of Array.isArray(value) ? value : [value]) {
      searchParams.append(name, String(queryValue));
    }
  }

  const queryString = searchParams.toString();
  return `${path.replace(/^\/+/, "")}${queryString ? `?${queryString}` : ""}`;
};

export const mountGetRemoteContentMessageAttachmentHandler = (
  server: FastifyInstance,
  useCase: GetRemoteContentMessageAttachmentUseCase,
): void => {
  mountFastifyHttpResultRoute(server, {
    contract: getRemoteContentMessageAttachmentContract,
    errorMapper: toGetRemoteContentMessageAttachmentHttpError,
    inputMapper: (request, userIdentity) => ({
      assertionRef: userIdentity.assertion_ref,
      attachmentUrl: toAttachmentUrl(request.path["*"], request.query),
      fiscalCode: userIdentity.fiscal_code,
      lollipopRequestHeaders: request.headers,
      messageId: request.path.id,
    }),
    middlewares: [makeXUserMiddleware()] as const,
    useCase,
  });
};
