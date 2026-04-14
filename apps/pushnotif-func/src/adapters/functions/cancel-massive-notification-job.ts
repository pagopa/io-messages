import { HttpHandler } from "@azure/functions";

import {
  ErrorConflict,
  ErrorInternal,
  ErrorNotFound,
} from "../../domain/error";
import { createHttpResponse } from "../../domain/http-request";
import { massiveJobIDSchema } from "../../domain/massive-jobs";
import { CancelMassiveNotificationJobUseCase } from "../../domain/use-cases/cancel-massive-notification-job";

export const cancelMassiveNotificationJobHandler =
  (
    cancelMassiveNotificationJobUseCase: CancelMassiveNotificationJobUseCase,
  ): HttpHandler =>
  async (request) => {
    const parsedIdParameter = massiveJobIDSchema.safeParse(
      request.params["id"],
    );

    if (!parsedIdParameter.success) {
      return createHttpResponse(400, {
        error: "Invalid job id in request params",
        issues: parsedIdParameter.error.issues,
      });
    }

    const result = await cancelMassiveNotificationJobUseCase.execute(
      parsedIdParameter.data,
    );

    if (result instanceof ErrorConflict) {
      return createHttpResponse(409, {
        error: result.message,
        jobId: parsedIdParameter.data,
      });
    }

    if (result instanceof ErrorNotFound) {
      return createHttpResponse(404, { error: result.message });
    }

    if (result instanceof ErrorInternal) {
      return createHttpResponse(500, {
        cause: result.cause,
        error: result.message,
      });
    }

    return createHttpResponse(200, result);
  };
