import { HttpHandler } from "@azure/functions";
import z from "zod";

import { ErrorInternal, ErrorValidation } from "../../domain/error";
import {
  createHttpResponse,
  parseHttpRequestBody,
} from "../../domain/http-request";
import { MakeCreateMassiveNotificationJobUseCase } from "../../domain/use-cases/create-massive-notification-job";

export const CreateMassiveJobPayloadSchema = z.object({
  executionTimeInHours: z.number().int().min(2).max(12).default(2),
  message: z.string().min(1).max(1000),
  title: z.string().min(1).max(500),
});

export type CreateMassiveJobPayload = z.infer<
  typeof CreateMassiveJobPayloadSchema
>;

export const createMassiveNotificationJobHandler =
  (
    createMassiveNotificationJobUseCase: MakeCreateMassiveNotificationJobUseCase,
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

    const result = await createMassiveNotificationJobUseCase.execute(
      parsedBody.message,
      parsedBody.executionTimeInHours,
      parsedBody.title,
    );

    if (result instanceof ErrorInternal) {
      return createHttpResponse(500, { error: result.message });
    }

    return createHttpResponse(201, { id: result.id, status: result.status });
  };
