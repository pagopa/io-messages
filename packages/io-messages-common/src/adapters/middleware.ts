import {
  HttpHandler,
  HttpRequest,
  HttpResponse,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";

import { ProblemJson, problemJsonSchema } from "../domain/problem-json.js";

export class MiddlewareError extends Error {
  body?: ProblemJson;
  name: string;

  constructor(message: string, body?: ProblemJson) {
    super(`MiddlewareError | ${message}`);
    this.name = "MiddlawareError";
    if (body) {
      this.body = body;
    }
  }
}

export type Middleware = (
  request: HttpRequest,
  context: InvocationContext,
) => Promise<void>;

export function handlerWithMiddleware(
  middleware: Middleware,
  handler: HttpHandler,
): HttpHandler {
  return async (req, ctx) => {
    try {
      await middleware(req, ctx);
    } catch (error) {
      return parseMiddlewareErrorResponse(error);
    }

    return handler(req, ctx);
  };
}

function parseMiddlewareErrorResponse(
  error: unknown,
): HttpResponse | HttpResponseInit {
  if (error instanceof MiddlewareError) {
    if (error.body) {
      const combinedDetail = `${error.message} | ${error.body.detail}`;
      error.body.detail = combinedDetail;

      return {
        jsonBody: error.body,
        status: 400,
      };
    }

    const jsonBody = problemJsonSchema.parse({
      detail: error.message,
      status: 400,
      title: "Middleware Error",
    });
    return {
      jsonBody,
      status: 400,
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
