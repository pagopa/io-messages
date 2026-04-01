import { HttpHandler } from "@azure/functions";

import { ErrorInternal, ErrorValidation } from "../../domain/error";
import {
  createHttpResponse,
  parseHttpRequestBody,
} from "../../domain/http-request";
import { CreateMassiveJobPayloadSchema } from "../../domain/massive-jobs";
import { CreateMassiveNotificationJobUseCase } from "../../domain/use-cases/create-massive-notification-job";

export const createMassiveNotificationJobHandler =
  (
    createMassiveNotificationJobUseCase: CreateMassiveNotificationJobUseCase,
  ): HttpHandler =>
  async (request) => {
    const parsedBody = await parseHttpRequestBody(
      request,
      CreateMassiveJobPayloadSchema,
    );

    if (parsedBody instanceof ErrorValidation) {
      return createHttpResponse(400, {
        error: parsedBody.message,
        issues: parsedBody.issues,
      });
    }

    const result =
      await createMassiveNotificationJobUseCase.execute(parsedBody);

    if (result instanceof ErrorInternal) {
      return createHttpResponse(500, { error: result.message });
    }

    return createHttpResponse(201, { id: result });
  };
