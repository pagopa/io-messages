import {
  aLollipopLambdaHeaders,
  aLollipopLambdaQuery,
  aLollipopLambdaRequestBody,
  aLollipopLambdaSuccessResponse,
} from "@/__mocks__/lollipop-lambda.js";
import { describe, expect, it, vi } from "vitest";

import { LollipopLambdaErrorResponse } from "../definitions.js";
import LollipopIntegrationCheckClient from "../lollipop-integration-check.js";

const baseUrl = "https://mockurl.com";
const client = new LollipopIntegrationCheckClient(baseUrl, "mock-api-key");

const aLollipopLambdaErrorResponse: LollipopLambdaErrorResponse = {
  error: {
    message: "Unauthorized",
    statusCode: 401,
  },
  success: false,
  timestamp: "2026-01-29T10:00:00Z",
};

describe("LollipopIntegrationCheckClient.checkWithGet", () => {
  it("returns a valid LollipopLambdaSuccessResponse on successful request", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      json: async () => aLollipopLambdaSuccessResponse,
      ok: true,
      status: 200,
    } as Response);

    const response = await client.checkWithGet(aLollipopLambdaHeaders);

    expect(response).toEqual(aLollipopLambdaSuccessResponse);
    expect(fetchSpy).toHaveBeenCalledWith(
      `${baseUrl}/io-playground/lollipop-test`,
      expect.objectContaining({
        headers: expect.objectContaining({
          "content-type": "application/json",
          "x-pagopa-cx-taxid": aLollipopLambdaHeaders["x-pagopa-cx-taxid"],
        }),
        method: "GET",
      }),
    );
  });

  it("returns a valid LollipopLambdaSuccessResponse with query parameters", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      json: async () => aLollipopLambdaSuccessResponse,
      ok: true,
      status: 200,
    } as Response);

    const response = await client.checkWithGet(
      aLollipopLambdaHeaders,
      aLollipopLambdaQuery,
    );

    expect(response).toEqual(aLollipopLambdaSuccessResponse);
    expect(fetchSpy).toHaveBeenCalledWith(
      `${baseUrl}/io-playground/lollipop-test?testParam=testValue`,
      expect.objectContaining({
        headers: expect.objectContaining({
          "content-type": "application/json",
        }),
        method: "GET",
      }),
    );
  });

  it("throws an error with LollipopLambdaErrorResponse when the api returns a 500", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      json: async () => aLollipopLambdaErrorResponse,
      ok: false,
      status: 500,
    } as Response);

    await expect(client.checkWithGet(aLollipopLambdaHeaders)).rejects.toEqual(
      expect.objectContaining({
        body: aLollipopLambdaErrorResponse,
        message: `The api responded with HTTP status 500`,
        status: 500,
      }),
    );

    expect(fetchSpy).toHaveBeenCalledWith(
      `${baseUrl}/io-playground/lollipop-test`,
      expect.objectContaining({
        headers: expect.objectContaining({
          "content-type": "application/json",
        }),
        method: "GET",
      }),
    );

    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("should throw a generic error if the fetch or something else fails", async () => {
    const returnedError = new Error("Network error");
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockRejectedValueOnce(returnedError);

    await expect(
      client.checkWithGet(aLollipopLambdaHeaders, aLollipopLambdaQuery),
    ).rejects.toEqual(
      expect.objectContaining({
        message: "Network error",
      }),
    );

    expect(fetchSpy).toHaveBeenCalledWith(
      `${baseUrl}/io-playground/lollipop-test?testParam=testValue`,
      expect.objectContaining({
        headers: expect.objectContaining({
          "content-type": "application/json",
        }),
        method: "GET",
      }),
    );

    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });
});

describe("LollipopIntegrationCheckClient.checkWithPost", () => {
  it("returns a valid LollipopLambdaSuccessResponse on successful request", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      json: async () => aLollipopLambdaSuccessResponse,
      ok: true,
      status: 200,
    } as Response);

    const response = await client.checkWithPost(aLollipopLambdaHeaders);

    expect(response).toEqual(aLollipopLambdaSuccessResponse);
    expect(fetchSpy).toHaveBeenCalledWith(
      `${baseUrl}/io-playground/lollipop-test`,
      expect.objectContaining({
        body: undefined,
        headers: expect.objectContaining({
          "content-type": "application/json",
          "x-pagopa-cx-taxid": aLollipopLambdaHeaders["x-pagopa-cx-taxid"],
        }),
        method: "POST",
      }),
    );
  });

  it("returns a valid LollipopLambdaSuccessResponse with query and body", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      json: async () => aLollipopLambdaSuccessResponse,
      ok: true,
      status: 200,
    } as Response);

    const response = await client.checkWithPost(
      aLollipopLambdaHeaders,
      aLollipopLambdaQuery,
      aLollipopLambdaRequestBody,
    );

    expect(response).toEqual(aLollipopLambdaSuccessResponse);
    expect(fetchSpy).toHaveBeenCalledWith(
      `${baseUrl}/io-playground/lollipop-test?testParam=testValue`,
      expect.objectContaining({
        body: JSON.stringify(aLollipopLambdaRequestBody),
        headers: expect.objectContaining({
          "content-type": "application/json",
        }),
        method: "POST",
      }),
    );
  });

  it("returns a valid LollipopLambdaSuccessResponse with body but no query", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      json: async () => aLollipopLambdaSuccessResponse,
      ok: true,
      status: 200,
    } as Response);

    const response = await client.checkWithPost(
      aLollipopLambdaHeaders,
      undefined,
      aLollipopLambdaRequestBody,
    );

    expect(response).toEqual(aLollipopLambdaSuccessResponse);
    expect(fetchSpy).toHaveBeenCalledWith(
      `${baseUrl}/io-playground/lollipop-test`,
      expect.objectContaining({
        body: JSON.stringify(aLollipopLambdaRequestBody),
        headers: expect.objectContaining({
          "content-type": "application/json",
        }),
        method: "POST",
      }),
    );
  });

  it("should throw a generic error if the fetch or something else fails", async () => {
    const returnedError = new Error("Network error");
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockRejectedValueOnce(returnedError);

    await expect(
      client.checkWithPost(
        aLollipopLambdaHeaders,
        aLollipopLambdaQuery,
        aLollipopLambdaRequestBody,
      ),
    ).rejects.toEqual(
      expect.objectContaining({
        message: "Network error",
      }),
    );

    expect(fetchSpy).toHaveBeenCalledWith(
      `${baseUrl}/io-playground/lollipop-test?testParam=testValue`,
      expect.objectContaining({
        body: JSON.stringify(aLollipopLambdaRequestBody),
        headers: expect.objectContaining({
          "content-type": "application/json",
        }),
        method: "POST",
      }),
    );

    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });
});
