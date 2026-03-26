import { HttpHandler } from "@azure/functions";

import { ErrorInternal, ErrorValidation } from "../../domain/error";
import { CreateMassiveNotificationJob } from "../../domain/use-cases/create-massive-notification-job";

export const createMassiveNotificationJobHandler =
  (
    createMassiveNotificationJobUseCase: CreateMassiveNotificationJob,
  ): HttpHandler =>
  async (request) => {
    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return {
        body: JSON.stringify({ error: "Invalid JSON body" }),
        headers: { "Content-Type": "application/json" },
        status: 400,
      };
    }

    const result = await createMassiveNotificationJobUseCase.execute(rawBody);

    if (result instanceof Error) {
      if (result instanceof ErrorValidation) {
        return {
          body: JSON.stringify({
            details: result.issues,
            error: "Bad Request",
          }),
          headers: { "Content-Type": "application/json" },
          status: 400,
        };
      } else if (result instanceof ErrorInternal) {
        return {
          body: JSON.stringify({ error: result.message }),
          headers: { "Content-Type": "application/json" },
          status: 500,
        };
      } else {
        return {
          body: JSON.stringify({ error: "Unexpected error" }),
          headers: { "Content-Type": "application/json" },
          status: 500,
        };
      }
    }

    return {
      body: JSON.stringify({ id: result }),
      headers: { "Content-Type": "application/json" },
      status: 201,
    };
  };
