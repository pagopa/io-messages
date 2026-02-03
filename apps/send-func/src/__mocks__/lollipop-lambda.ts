import {
  lollipopLambdaHeadersSchema,
  lollipopLambdaQuerySchema,
  lollipopLambdaRequestBodySchema,
  lollipopLambdaSuccessResponseSchema,
} from "@/domain/lollipop-lambda.js";
import { Mock, vi } from "vitest";

import {
  aFiscalCode,
  aSendHeaders,
  anOriginalMethod,
  anOriginalUrl,
} from "./notification.js";

export const aLollipopLambdaHeaders = lollipopLambdaHeadersSchema.parse({
  ...aSendHeaders,
  "content-digest": "sha-256=:X48E9qOokqqrvdts8nOJRJN3OWDUoyWxBf7kbu9DBPE=:",
});

export const aLollipopLambdaQuery = lollipopLambdaQuerySchema.parse({
  testParam: "testValue",
});

export const aLollipopLambdaRequestBody = lollipopLambdaRequestBodySchema.parse(
  {
    nestedObject: {
      key: "value",
    },
    testField: "test value",
  },
);

export const aLollipopLambdaSuccessResponse =
  lollipopLambdaSuccessResponseSchema.parse({
    data: {
      authorizerContext: {
        familyName: "Rossi",
        name: "Mario",
        userId: aFiscalCode,
      },
      lollipopHeaders: {
        "x-pagopa-lollipop-original-method": anOriginalMethod,
        "x-pagopa-lollipop-original-url": anOriginalUrl,
      },
      message: "Request processed successfully",
      request: {
        bodyLength: 123,
        hasBody: true,
        method: "POST",
        path: "/io-playground/lollipop-test",
        queryParameters: {
          testParam: "testValue",
        },
        requestTime: "2026-01-29T10:00:00Z",
      },
      requestBody: {
        testField: "test value",
      },
      summary: {
        authorizerContextKeys: ["userId", "name", "familyName"],
        hasAuthorizerContext: true,
        headers: {
          "content-type": "application/json",
        },
      },
      timestamp: "2026-01-29T10:00:00Z",
    },
    success: true,
    timestamp: "2026-01-29T10:00:00Z",
  });

interface MockLollipopLambdaClient {
  checkWithGet: Mock;
  checkWithPost: Mock;
}

export const createMockLollipopLambdaClient = (): MockLollipopLambdaClient => ({
  checkWithGet: vi
    .fn()
    .mockImplementation(() => Promise.resolve(aLollipopLambdaSuccessResponse)),
  checkWithPost: vi
    .fn()
    .mockImplementation(() => Promise.resolve(aLollipopLambdaSuccessResponse)),
});
