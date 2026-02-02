import {
  aLollipopLambdaRequestBody,
  aLollipopLambdaSuccessResponse,
  createMockLollipopLambdaClient,
} from "@/__mocks__/lollipop-lambda.js";
import { aLollipopHeaders } from "@/__mocks__/notification.js";
import { TelemetryEventService } from "@/adapters/appinsights/appinsights.js";
import { LollipopIntegrationCheckClientError } from "@/adapters/send/lollipop-integration-check.js";
import { LambdaLollipopCheckUseCase } from "@/domain/use-cases/lollipop-lambda-check.js";
import {
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { lollipopIntegrationCheck } from "../lollipop-integration-check.js";

const trackEventMock = vi.fn(() => Promise.resolve());
const mocks = vi.hoisted(() => ({
  TelemetryClient: vi.fn().mockImplementation(() => ({
    trackEvent: trackEventMock,
  })),
}));

const telemetryClient = new mocks.TelemetryClient();
const telemetryServiceMock = new TelemetryEventService(telemetryClient);
const telemetryTrackEventMock = vi
  .spyOn(telemetryServiceMock, "trackEvent")
  .mockResolvedValue();

const mockLollipopLambdaClient = createMockLollipopLambdaClient();
const getLollipopLambdaClient = vi.fn(() => mockLollipopLambdaClient);

const lollipopLambdaCheckUseCase = new LambdaLollipopCheckUseCase(
  getLollipopLambdaClient,
);

const handler = lollipopIntegrationCheck(
  lollipopLambdaCheckUseCase,
  telemetryServiceMock,
);

const context = new InvocationContext();

const lollipopLambdaCheckExecuteSpy = vi.spyOn(
  lollipopLambdaCheckUseCase,
  "execute",
);

describe("LollipopIntegrationCheck", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET requests", () => {
    it("returns 200 status code if the GET request is well-formed", async () => {
      const request = new HttpRequest({
        method: "GET",
        url: "http://localhost?isTest=false&testParam=testValue",
      });

      await expect(
        handler(request, context, aLollipopHeaders),
      ).resolves.toEqual({
        jsonBody: aLollipopLambdaSuccessResponse,
        status: 200,
      });

      expect(lollipopLambdaCheckExecuteSpy).toHaveBeenCalledWith(
        false,
        "GET",
        {
          "x-pagopa-cx-taxid": aLollipopHeaders["x-pagopa-lollipop-user-id"],
          ...aLollipopHeaders,
        },
        {
          testParam: "testValue",
        },
        undefined,
      );

      expect(mockLollipopLambdaClient.checkWithGet).toHaveBeenCalledOnce();
      expect(mockLollipopLambdaClient.checkWithPost).not.toHaveBeenCalled();
      expect(telemetryTrackEventMock).not.toHaveBeenCalled();
    });

    it("uses test client when isTest query parameter is true", async () => {
      const request = new HttpRequest({
        method: "GET",
        url: "http://localhost?isTest=true",
      });

      await expect(
        handler(request, context, aLollipopHeaders),
      ).resolves.toEqual({
        jsonBody: aLollipopLambdaSuccessResponse,
        status: 200,
      });

      expect(lollipopLambdaCheckExecuteSpy).toHaveBeenCalledWith(
        true,
        "GET",
        expect.any(Object),
        expect.any(Object),
        undefined,
      );

      expect(getLollipopLambdaClient).toHaveBeenCalledWith(true);
    });
  });

  describe("POST requests", () => {
    it("returns 200 status code if the POST request is well-formed", async () => {
      const request = new HttpRequest({
        body: { string: JSON.stringify(aLollipopLambdaRequestBody) },
        method: "POST",
        url: "http://localhost?isTest=false&testParam=testValue",
      });

      await expect(
        handler(request, context, aLollipopHeaders),
      ).resolves.toEqual({
        jsonBody: aLollipopLambdaSuccessResponse,
        status: 200,
      });

      expect(lollipopLambdaCheckExecuteSpy).toHaveBeenCalledWith(
        false,
        "POST",
        {
          "x-pagopa-cx-taxid": aLollipopHeaders["x-pagopa-lollipop-user-id"],
          ...aLollipopHeaders,
        },
        {
          testParam: "testValue",
        },
        aLollipopLambdaRequestBody,
      );

      expect(mockLollipopLambdaClient.checkWithPost).toHaveBeenCalledOnce();
      expect(mockLollipopLambdaClient.checkWithGet).not.toHaveBeenCalled();
      expect(telemetryTrackEventMock).not.toHaveBeenCalled();
    });
  });

  describe("Error handling", () => {
    it("returns client error status code and body when LollipopIntegrationCheckClientError occurs", async () => {
      const errorBody = {
        error: {
          message: "Lambda error message",
          statusCode: 403,
        },
        success: false as const,
        timestamp: "2026-01-29T10:00:00Z",
      };

      lollipopLambdaCheckExecuteSpy.mockImplementationOnce(() =>
        Promise.reject(
          new LollipopIntegrationCheckClientError(
            "Client error",
            403,
            errorBody,
          ),
        ),
      );

      const request = new HttpRequest({
        method: "GET",
        url: "http://localhost?isTest=false",
      });

      await expect(
        handler(request, context, aLollipopHeaders),
      ).resolves.toEqual({
        jsonBody: errorBody,
        status: 403,
      });

      expect(lollipopLambdaCheckExecuteSpy).toHaveBeenCalledOnce();
      expect(telemetryTrackEventMock).toHaveBeenCalledOnce();
    });

    it("returns 500 status code for generic errors", async () => {
      const genericError = new Error("Generic error");

      lollipopLambdaCheckExecuteSpy.mockImplementationOnce(() =>
        Promise.reject(genericError),
      );

      const request = new HttpRequest({
        method: "GET",
        url: "http://localhost?isTest=false",
      });

      const result: HttpResponseInit = await handler(
        request,
        context,
        aLollipopHeaders,
      );

      expect(result.status).toBe(500);
      expect(result.jsonBody).toMatchObject({
        error: {
          message: "Generic error",
          statusCode: 500,
        },
        success: false,
      });
      expect(result.jsonBody.timestamp).toBeDefined();

      expect(lollipopLambdaCheckExecuteSpy).toHaveBeenCalledOnce();
      expect(telemetryTrackEventMock).not.toHaveBeenCalled();
    });
  });
});
