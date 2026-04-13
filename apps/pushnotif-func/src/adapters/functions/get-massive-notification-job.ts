import { GetMassiveNotificationJobUseCase } from "@/domain/use-cases/get-massive-notification-job";
import { HttpHandler } from "@azure/functions";

import { ErrorInternal, ErrorNotFound } from "../../domain/error";
import { createHttpResponse } from "../../domain/http-request";
import { massiveJobIDSchema } from "../../domain/massive-jobs";

export const getGetMassiveNotificationJobHandler =
  (
    getMassiveNotificationJobUseCase: GetMassiveNotificationJobUseCase,
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

    const result = await getMassiveNotificationJobUseCase.execute(
      parsedIdParameter.data,
    );

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
