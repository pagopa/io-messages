import { StartMassiveNotificationJobUseCase } from "@/domain/use-cases/start-massive-notification-job";
import { HttpHandler } from "@azure/functions";

import { ErrorInternal } from "../../domain/error";
import { createHttpResponse } from "../../domain/http-request";
import { massiveJobIDSchema } from "../../domain/massive-jobs";

export const startMassiveNotificationJobHandler =
  (
    startMassiveNotificationJobUseCase: StartMassiveNotificationJobUseCase,
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

    const result = await startMassiveNotificationJobUseCase.execute(
      parsedIdParameter.data,
    );

    if (result instanceof ErrorInternal) {
      return createHttpResponse(500, { error: result.message });
    }

    return createHttpResponse(201, { id: result });
  };
