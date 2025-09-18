import { HttpHandler, HttpRequest, InvocationContext } from "@azure/functions";

export class MiddlewareError extends Error {
  name = "MiddlewareError";

  constructor(message: string) {
    super(`MiddlewareError | ${message}`);
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
      if (error instanceof MiddlewareError) {
        return {
          jsonBody: error,
          status: 400,
        };
      }
      const message =
        "Middleware Error | " + (error instanceof Error ? error.message : "");
      return {
        jsonBody: { error, message },
        status: 500,
      };
    }

    return handler(req, ctx);
  };
}
