import { HttpHandler } from "@azure/functions";

import { ErrorInternal, ErrorValidation } from "../../domain/error";
import { parseRequestBody } from "../../domain/http-request";
import { CreateMassiveJobPayloadSchema } from "../../domain/massive-jobs";
import { CreateMassiveNotificationJobUseCase } from "../../domain/use-cases/create-massive-notification-job";

export const createMassiveNotificationJobHandler =
  (
    createMassiveNotificationJobUseCase: CreateMassiveNotificationJobUseCase,
  ): HttpHandler =>
  async (request) => {
    const parsedBody = await parseRequestBody(
      request,
      CreateMassiveJobPayloadSchema,
    );

    if (parsedBody instanceof ErrorValidation) {
      return {
        body: JSON.stringify({
          error: parsedBody.message,
          issues: parsedBody.issues,
        }),
        headers: { "Content-Type": "application/json" },
        status: 400,
      };
    }

    const result =
      await createMassiveNotificationJobUseCase.execute(parsedBody);

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
