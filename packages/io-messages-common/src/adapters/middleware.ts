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
    super(message);
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

export type Middleware<MiddlewareParam = void> = (
  request: HttpRequest,
  context: InvocationContext,
) => Promise<MiddlewareParam>;

export type ExtentedHttpHandler<MiddlewareParam> = (
  req: HttpRequest,
  ctx: InvocationContext,
  middlewareParam: MiddlewareParam,
) => Promise<HttpResponse | HttpResponseInit>;

export function handlerWithMiddleware<MiddlewareParam>(
  middleware: Middleware<MiddlewareParam>,
  handler: ExtentedHttpHandler<MiddlewareParam> | HttpHandler,
): HttpHandler {
  return async (req, ctx) => {
    let extraArgs: MiddlewareParam;
    try {
      extraArgs = await middleware(req, ctx);
    } catch (error) {
      return parseMiddlewareErrorResponse(error);
    }

    return handler(req, ctx, extraArgs);
  };
}

function parseMiddlewareErrorResponse(error: unknown): HttpResponseInit {
  if (error instanceof MiddlewareError) {
    return {
      jsonBody: error.body,
      status: error.status,
    };
  }

  const errorMessage =
    error instanceof Error ? error.message : JSON.stringify(error);
  const jsonBody = problemJsonSchema.parse({
    detail: errorMessage,
    status: 500,
    title: "Middleware Error",
  });

  return {
    jsonBody,
    status: 500,
  };
}
