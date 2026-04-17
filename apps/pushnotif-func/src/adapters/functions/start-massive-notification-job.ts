import { HttpHandler } from "@azure/functions";
import z from "zod";

import {
  ErrorInternal,
  ErrorNotFound,
  ErrorValidation,
} from "../../domain/error";
import {
  createHttpResponse,
  parseHttpRequestBody,
} from "../../domain/http-request";
import { massiveJobIDSchema } from "../../domain/massive-jobs";
import { MakeStartMassiveNotificationJobUseCase } from "../../domain/use-cases/start-massive-notification-job";

const StartMassiveJobPayloadSchema = z.object({
  startTimeTimestamp: z.coerce
    .number()
    .int()
    .positive()
    .transform((value) =>
      // If the value is in milliseconds, convert it to seconds
      value >= 1_000_000_000_000 ? Math.floor(value / 1000) : value,
    )
    .refine((value) => value >= Math.floor(Date.now() / 1000) + 60 * 30, {
      message: "startTimeTimestamp must be at least 30 minutes in the future",
    })
    .default(() => Math.floor((Date.now() + 60 * 60 * 1000) / 1000)), // default to 1 hour from now
});

export const startMassiveNotificationJobHandler =
  (
    startMassiveNotificationJobUseCase: MakeStartMassiveNotificationJobUseCase,
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
      parsedIdParameter.data,
      parsedBody.startTimeTimestamp,
    );

    if (
      result instanceof ErrorInternal ||
      result instanceof ErrorNotFound ||
      result instanceof ErrorValidation
    ) {
      return createHttpResponse(Number.parseInt(result.code, 10), {
        error: result.message,
      });
    }

    return createHttpResponse(200, { id: result.id, status: result.status });
  };
