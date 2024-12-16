import { aFiscalCode, aMaskedFiscalCode } from "@/__mocks__/message.js";
import { describe, expect, it, vi } from "vitest";

import PDVTokenizerClient from "../pdv-tokenizer-client.js";

const apiKey = "anApiKey";
const baseUrl = "https://mockurl.com";
const client = new PDVTokenizerClient(apiKey, baseUrl);
const fiscalCode = aFiscalCode;

describe("PDVTokenizerClient", () => {
  it("should return a token on successful tokenization", async () => {
    const mockResponse = {
      token: aMaskedFiscalCode,
    };

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      json: async () => mockResponse,
      ok: true,
      status: 200,
    } as Response);

    const token = await client.maskSensitiveInfo(fiscalCode);

    expect(token).toBe(aMaskedFiscalCode);
    expect(fetchSpy).toHaveBeenCalledWith(
      `${baseUrl}/tokens`,
      expect.objectContaining({
        body: JSON.stringify({ pii: fiscalCode }),
        headers: expect.objectContaining({
          "content-type": "application/json",
          "x-api-key": apiKey,
        }),
        method: "PUT",
      }),
    );
  });

  it("should throw an error with the response in the cause when the API responds with an error", async () => {
    const mockErrorResponse = {
      detail: "Invalid parameter",
      status: 400,
      title: "Bad Request",
      type: "client_error",
    };

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      json: async () => mockErrorResponse,
      ok: false,
      status: 400,
    } as Response);

    try {
      await client.maskSensitiveInfo(fiscalCode);
      throw new Error("Expected error to be thrown");
    } catch (error) {
      const typedError = error as Error;
      expect(typedError.message).toBe(
        `Error in tokenizer api call with status 400 and body ${JSON.stringify(mockErrorResponse)}`,
      );
    }

    expect(fetchSpy).toHaveBeenCalledWith(
      `${baseUrl}/tokens`,
      expect.objectContaining({
        body: JSON.stringify({ pii: fiscalCode }),
        headers: expect.objectContaining({
          "content-type": "application/json",
          "x-api-key": apiKey,
        }),
        method: "PUT",
      }),
    );

    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("should throw an error if fetch fails", async () => {
    const returnedError = new Error("Network error");
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockRejectedValueOnce(returnedError);

    try {
      await client.maskSensitiveInfo(fiscalCode);
      throw new Error("Expected error to be thrown");
    } catch (error) {
      const typedError = error as Error;
      expect(typedError.message).toBe(
        "Error during tokenizer api call | Error: Network error",
      );
    }

    expect(fetchSpy).toHaveBeenCalledWith(
      `${baseUrl}/tokens`,
      expect.objectContaining({
        body: JSON.stringify({ pii: fiscalCode }),
        headers: expect.objectContaining({
          "content-type": "application/json",
          "x-api-key": apiKey,
        }),
        method: "PUT",
      }),
    );

    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });
});
