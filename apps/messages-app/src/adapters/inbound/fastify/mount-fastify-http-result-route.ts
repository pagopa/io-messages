import type {
  BaseError,
  ResponseMap,
  RouteContract,
  RouteRequestSchemas,
  UseCase,
  WireRequest,
} from "@pagopa/hexagonal-core";
import type { FastifyInstance } from "fastify";

import {
  GenericError,
  createHttpRequestPayloadValidator,
  getEntrySchema,
  isNoBodyStatus,
  isRedirectEntry,
  isSuccessStatus,
} from "@pagopa/hexagonal-core";
import {
  fastifyExtractPayload,
  sendErrorResponse,
} from "@pagopa/hexagonal-fastify";
import z from "zod";

export interface HttpRouteOutput<
  Status extends number = number,
  Body = unknown,
> {
  readonly body: Body;
  readonly status: Status;
}

const fastifyMethod = {
  delete: "DELETE",
  get: "GET",
  patch: "PATCH",
  post: "POST",
  put: "PUT",
} as const;

const buildWireSchema = (request: RouteRequestSchemas) =>
  z.object({
    body: request.body ?? z.unknown(),
    headers: request.headers ?? z.unknown(),
    path: request.path ?? z.unknown(),
    query: request.query ?? z.unknown(),
  });

const toFastifyPath = (path: string): string =>
  path.replace(/\{([^{}]+)\}/g, ":$1");

const resolveSuccessStatus = (response: ResponseMap): number => {
  const statuses = Object.keys(response).map(Number).filter(isSuccessStatus);

  if (statuses.length !== 1) {
    throw new Error(
      `mountFastifyHttpResultRoute: expected exactly one success response, found ${statuses.length}.`,
    );
  }

  return statuses[0];
};

export const mountFastifyHttpResultRoute = <
  Req extends RouteRequestSchemas,
  Resp extends ResponseMap,
  UseCaseInput extends object,
  SuccessOutput,
  ErrorOutput extends HttpRouteOutput<number, unknown> = never,
  MappedSuccessBody = SuccessOutput,
  E extends BaseError = never,
>(
  server: FastifyInstance,
  spec: {
    readonly contract: RouteContract<Req, Resp>;
    readonly errorMapper?: (error: E) => ErrorOutput | undefined;
    readonly inputMapper: (request: WireRequest<Req>) => UseCaseInput;
    readonly outputMapper?: (body: SuccessOutput) => MappedSuccessBody;
    readonly useCase: UseCase<UseCaseInput, SuccessOutput, E>;
  },
): void => {
  const successStatus = resolveSuccessStatus(spec.contract.response);
  const validator = createHttpRequestPayloadValidator(
    buildWireSchema(spec.contract.request),
  );

  server.route({
    handler: async (request, reply) => {
      const payload = fastifyExtractPayload(request);
      const validationResult = await validator(payload);

      if (validationResult.isErr()) {
        return sendErrorResponse(reply, validationResult.error);
      }

      const input = spec.inputMapper(
        validationResult.value as WireRequest<Req>,
      );
      const result = await spec.useCase(input);

      const output = result.isOk()
        ? {
            body: spec.outputMapper
              ? spec.outputMapper(result.value)
              : result.value,
            status: successStatus,
          }
        : spec.errorMapper?.(result.error);

      if (output === undefined) {
        return sendErrorResponse(reply, result._unsafeUnwrapErr());
      }

      const responseEntry = spec.contract.response[output.status];
      if (responseEntry === undefined || isRedirectEntry(responseEntry)) {
        return sendErrorResponse(
          reply,
          new GenericError(
            `HTTP response status ${output.status} is not declared as a response body.`,
          ),
        );
      }

      if (isNoBodyStatus(output.status)) {
        return reply.code(output.status).send();
      }

      const parsedBody = await getEntrySchema(responseEntry)[
        "~standard"
      ].validate(output.body);

      if (parsedBody.issues) {
        return sendErrorResponse(
          reply,
          new GenericError("Output encoding failed."),
        );
      }

      if (output.status >= 400) {
        reply.header("Content-Type", "application/problem+json");
      }

      return reply.code(output.status).send(parsedBody.value);
    },
    method: fastifyMethod[spec.contract.method],
    url: toFastifyPath(spec.contract.path),
  });
};
