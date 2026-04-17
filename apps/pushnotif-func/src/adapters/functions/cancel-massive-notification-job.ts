import { HttpHandler } from "@azure/functions";

import { createHttpResponse } from "../../domain/http-request";
import { massiveJobIDSchema } from "../../domain/massive-jobs";
import { CancelMassiveNotificationJobUseCase } from "../../domain/use-cases/cancel-massive-notification-job";

export const makeCancelMassiveNotificationJobHandler =
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

    if (result instanceof Error) {
      return createHttpResponse(Number(result.code), {
        cause: result.cause,
        error: result.message,
        jobID: parsedIdParameter.data,
      });
    }

    return createHttpResponse(200, result);
  };
