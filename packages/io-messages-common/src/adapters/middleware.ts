import { StatusCode } from "@/domain/status-code.js";
import {
  HttpHandler,
  HttpRequest,
  HttpResponse,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";

import { ProblemJson, problemJsonSchema } from "../domain/problem-json.js";

export class MiddlewareError extends Error {
  body: ProblemJson;
  name: string;
  status: StatusCode;

  constructor(message: string, status: StatusCode, body?: ProblemJson) {
    super(`MiddlewareError | ${message}`);
    this.name = "MiddlawareError";
    this.status = status;
    this.body =
      body ??
      problemJsonSchema.parse({
        detail: this.message,
        status: this.status,
        title: "Middleware Error",
      });
  }
}

export type Middleware<MiddlewareParams extends unknown[] = []> = (
  request: HttpRequest,
  context: InvocationContext,
) => Promise<MiddlewareParams>;

export type ExtentedHttpHandler<MiddlewareParams extends unknown[] = []> = (
  req: HttpRequest,
  ctx: InvocationContext,
  ...middlewareArgs: MiddlewareParams
) => Promise<HttpResponse | HttpResponseInit>;

export function handlerWithMiddleware<MiddlewareParams extends unknown[]>(
  middleware: Middleware<MiddlewareParams>,
  handler: ExtentedHttpHandler<MiddlewareParams> | HttpHandler,
): HttpHandler {
  return async (req, ctx) => {
    let extraArgs: MiddlewareParams;
    try {
      extraArgs = await middleware(req, ctx);
    } catch (error) {
      return parseMiddlewareErrorResponse(error);
    }

    return handler(req, ctx, ...extraArgs);
  };
}

function parseMiddlewareErrorResponse(error: unknown): HttpResponseInit {
  if (error instanceof MiddlewareError) {
    error.body.detail = `${error.message} | ${error.body.detail}`;

    return {
      jsonBody: error.body,
      status: error.status,
    };
  }

  const errorMessage =
    error instanceof Error ? error.message : JSON.stringify(error);
  const jsonBody = problemJsonSchema.parse({
    detail: `Middleware Error | ${errorMessage}`,
    status: 500,
    title: "Middleware Error",
  });

  return {
    jsonBody,
    status: 500,
  };
}
