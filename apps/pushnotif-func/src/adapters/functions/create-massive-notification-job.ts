import { HttpHandler } from "@azure/functions";

import { ErrorInternal, ErrorValidation } from "../../domain/error";
import { parseRequestBodyToJson } from "../../domain/http-request";
import { CreateMassiveJobPayloadSchema } from "../../domain/massive-jobs";
import { CreateMassiveNotificationJobUseCase } from "../../domain/use-cases/create-massive-notification-job";

export const createMassiveNotificationJobHandler =
  (
    createMassiveNotificationJobUseCase: CreateMassiveNotificationJobUseCase,
  ): HttpHandler =>
  async (request) => {
    const rawBody = await parseRequestBodyToJson(request);
    if (rawBody instanceof ErrorValidation) {
      return {
        body: JSON.stringify({ error: rawBody.message }),
        headers: { "Content-Type": "application/json" },
        status: 400,
      };
    }

    const parsed = CreateMassiveJobPayloadSchema.safeParse(rawBody);
    if (!parsed.success) {
      return {
        body: JSON.stringify({
          details: parsed.error.issues,
          error: "Bad Request",
        }),
        headers: { "Content-Type": "application/json" },
        status: 400,
      };
    }

    const result = await createMassiveNotificationJobUseCase.execute(
      parsed.data,
    );
    if (result instanceof ErrorInternal) {
      return {
        body: JSON.stringify({ error: result.message }),
        headers: { "Content-Type": "application/json" },
        status: 500,
      };
    }

    return {
      body: JSON.stringify({ id: result }),
      headers: { "Content-Type": "application/json" },
      status: 201,
    };
  };
