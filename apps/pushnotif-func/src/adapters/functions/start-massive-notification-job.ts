import { HttpHandler } from "@azure/functions";

import { ErrorInternal, ErrorValidation } from "../../domain/error";
import {
  createHttpResponse,
  parseHttpRequestBody,
} from "../../domain/http-request";
import { StartMassiveNotificationJobPayloadSchema } from "../../domain/massive-jobs";
import { StartMassiveNotificationJobUseCase } from "@/domain/use-cases/start-massive-notification-job";

export const startMassiveNotificationJobHandler =
  (
    startMassiveNotificationJobUseCase: StartMassiveNotificationJobUseCase,
  ): HttpHandler =>
  async (request) => {
    const parsedBody = await parseHttpRequestBody(
      request,
      StartMassiveNotificationJobPayloadSchema,
    );

    if (parsedBody instanceof ErrorValidation) {
      return createHttpResponse(400, {
        error: parsedBody.message,
        issues: parsedBody.issues,
      });
    }

    const result = await startMassiveNotificationJobUseCase.execute(parsedBody);

    if (result instanceof ErrorInternal) {
      return createHttpResponse(500, { error: result.message });
    }

    return createHttpResponse(201, { id: result });
  };
