import { lollipopLambdaRequestBodySchema } from "@/domain/lollipop-lambda.js";
import { TelemetryEventName, TelemetryService } from "@/domain/telemetry.js";
import { LambdaLollipopCheckUseCase } from "@/domain/use-cases/lollipop-lambda-check.js";
import { HttpRequest, InvocationContext } from "@azure/functions";
import { LollipopHeaders } from "io-messages-common/adapters/lollipop/definitions/lollipop-headers";
import { ExtentedHttpHandler } from "io-messages-common/adapters/middleware";

import { LollipopLambdaCheckResponse } from "../send/definitions.js";
import { LollipopIntegrationCheckClientError } from "../send/lollipop-integration-check.js";

export const lollipopIntegrationCheck =
  (
    lollipopLambdaCheckUseCase: LambdaLollipopCheckUseCase,
    telemetryService: TelemetryService,
  ): ExtentedHttpHandler<LollipopHeaders> =>
  async (
    request: HttpRequest,
    context: InvocationContext,
    lollipopHeaders: LollipopHeaders,
  ): Promise<LollipopLambdaCheckResponse> => {
    const isTest = request.query.get("isTest") === "true";
    const headers = {
      "x-pagopa-cx-taxid": lollipopHeaders["x-pagopa-lollipop-user-id"],
      ...lollipopHeaders,
    };
    const query = Object.fromEntries(request.query.entries());
    delete query.isTest;
    const method = request.method === "POST" ? "POST" : "GET";

    try {
      const requestBody =
        method === "POST"
          ? lollipopLambdaRequestBodySchema.parse(await request.json())
          : undefined;

      const response = await lollipopLambdaCheckUseCase.execute(
        isTest,
        method,
        headers,
        query,
        requestBody,
      );

      return { jsonBody: response, status: 200 };
    } catch (err) {
      if (err instanceof LollipopIntegrationCheckClientError) {
        context.error("LollipopItegrationCheck client error:", err.message);

        telemetryService.trackEvent(
          TelemetryEventName.SEND_LIPPOP_INTEGRATION_CLIENT_ERROR,
          {
            body: err.body,
            status: err.status,
          },
        );

        return {
          jsonBody: err.body,
          status: err.status,
        };
      }

      const errorMessage =
        err instanceof Error ? err.message : JSON.stringify(err);
      context.error(err);

      return {
        jsonBody: {
          error: {
            message: errorMessage,
            statusCode: 500,
          },
          success: false,
          timestamp: new Date().toISOString(),
        },
        status: 500,
      };
    }
  };
