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
  body?: ProblemJson;
  name: string;
  status: StatusCode;

  constructor(message: string, status: StatusCode, body?: ProblemJson) {
    super(`MiddlewareError | ${message}`);
    this.name = "MiddlawareError";
    this.status = status;
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
      error.body.detail = `${error.message} | ${error.body.detail}`;

      return {
        jsonBody: error.body,
        status: error.status,
      };
    }

    const jsonBody = problemJsonSchema.parse({
      detail: error.message,
      status: error.status,
      title: "Middleware Error",
    });
    return {
      jsonBody,
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
