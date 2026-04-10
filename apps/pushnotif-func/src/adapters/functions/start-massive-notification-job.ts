import { StartMassiveNotificationJobUseCase } from "@/domain/use-cases/start-massive-notification-job";
import { HttpHandler } from "@azure/functions";

import { ErrorInternal, ErrorValidation } from "../../domain/error";
import {
  createHttpResponse,
  parseHttpRequestBody,
} from "../../domain/http-request";
import {
  StartMassiveJobPayloadSchema,
  massiveJobIDSchema,
} from "../../domain/massive-jobs";

export const startMassiveNotificationJobHandler =
  (
    startMassiveNotificationJobUseCase: StartMassiveNotificationJobUseCase,
  ): HttpHandler =>
  async (request, context) => {
    const parsedIdParameter = massiveJobIDSchema.safeParse(
      request.params["id"],
    );

    if (!parsedIdParameter.success) {
      return createHttpResponse(400, {
        error: "Invalid job id in request params",
        issues: parsedIdParameter.error.issues,
      });
    }

    const parsedBody = await parseHttpRequestBody(
      request,
      StartMassiveJobPayloadSchema,
    );

    if (parsedBody instanceof ErrorValidation) {
      return createHttpResponse(400, {
        error: parsedBody.message,
        issues: parsedBody.issues,
      });
    }

    const result = await startMassiveNotificationJobUseCase.execute(
      context,
      parsedIdParameter.data,
      parsedBody.startTimeTimestamp,
    );

    if (result instanceof ErrorInternal) {
      return createHttpResponse(500, { error: result.message });
    }

    return createHttpResponse(201, { id: result });
  };
