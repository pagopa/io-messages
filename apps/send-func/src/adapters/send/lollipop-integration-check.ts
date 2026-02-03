import {
  LollipopLambdaClient,
  LollipopLambdaHeaders,
  LollipopLambdaQuery,
  LollipopLambdaRequestBody,
  LollipopLambdaSuccessResponse,
  lollipopLambdaSuccessResponseSchema,
} from "@/domain/lollipop-lambda.js";
import * as z from "zod";

import {
  LollipopLambdaErrorResponse,
  lollipopLambdaErrorResponseSchema,
} from "./definitions.js";

export class LollipopIntegrationCheckClientError extends Error {
  body: LollipopLambdaErrorResponse;
  name: string;
  status: number;

  constructor(
    message: string,
    status: number,
    body: LollipopLambdaErrorResponse,
  ) {
    super(message);
    this.name = "LollipopIntegrationCheckClientError";
    this.status = status;
    this.body = body;
  }
}

const unsuccessfulResponseParsing = (
  responseJson: unknown,
  response: Response,
): LollipopLambdaErrorResponse => {
  const parsedProblem =
    lollipopLambdaErrorResponseSchema.safeParse(responseJson);
  return parsedProblem.success
    ? parsedProblem.data
    : {
        error: {
          message: JSON.stringify(z.treeifyError(parsedProblem.error)),
          statusCode: response.status,
        },
        success: false,
        timestamp: new Date().toISOString(),
      };
};

export default class LollipopIntegrationCheckClient
  implements LollipopLambdaClient
{
  #baseUrl: string;

  constructor(baseUrl: string) {
    this.#baseUrl = baseUrl;
  }

  #buildUrl(query?: LollipopLambdaQuery): URL {
    const url = new URL(`${this.#baseUrl}/io-playground/lollipop-test`);
    if (query) {
      Object.entries(query).forEach(([key, value]) => {
        url.searchParams.append(key, String(value));
      });
    }
    return url;
  }

  #parseResponse(
    response: Response,
    responseJson: unknown,
  ): LollipopLambdaSuccessResponse {
    if (!response.ok) {
      throw new LollipopIntegrationCheckClientError(
        `The api responded with HTTP status ${response.status}`,
        response.status,
        unsuccessfulResponseParsing(responseJson, response),
      );
    }

    const parsedResponse =
      lollipopLambdaSuccessResponseSchema.safeParse(responseJson);
    if (!parsedResponse.success) {
      const errorMessage = JSON.stringify(z.treeifyError(parsedResponse.error));
      throw new Error(
        `Error during lollipop check integration api call | ${errorMessage}`,
      );
    }

    return parsedResponse.data;
  }

  async checkWithGet(
    headers: LollipopLambdaHeaders,
    query?: LollipopLambdaQuery,
  ): Promise<LollipopLambdaSuccessResponse> {
    const response = await fetch(this.#buildUrl(query).toString(), {
      headers: { ...headers, "content-type": "application/json" },
      method: "GET",
    });

    const responseJson = await response.json();
    return this.#parseResponse(response, responseJson);
  }

  async checkWithPost(
    headers: LollipopLambdaHeaders,
    query?: LollipopLambdaQuery,
    requestBody?: LollipopLambdaRequestBody,
  ): Promise<LollipopLambdaSuccessResponse> {
    const response = await fetch(this.#buildUrl(query).toString(), {
      body: requestBody ? JSON.stringify(requestBody) : undefined,
      headers: { ...headers, "content-type": "application/json" },
      method: "POST",
    });

    const responseJson = await response.json();
    return this.#parseResponse(response, responseJson);
  }
}
