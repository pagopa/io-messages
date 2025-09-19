import { describe, expect, it, vi } from "vitest";

import {
  aProblemJson,
  aSignatureInput,
  anAssertionRef,
  anLcParams,
} from "../__mocks__/lollipop.js";
import LollipopClient from "../lollipop-client.js";

const apiKey = "anApiKey";
const baseUrl = "https://mockurl.com";
const client = new LollipopClient(apiKey, baseUrl);

describe("LollipopClient", () => {
  it("returns a valid LcParams on successful request", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      json: async () => anLcParams,
      ok: true,
      status: 200,
    } as Response);

    const lcParams = await client.generateLCParams(
      anAssertionRef,
      aSignatureInput,
    );

    expect(lcParams).toEqual(anLcParams);
    expect(fetchSpy).toHaveBeenCalledWith(
      `${baseUrl}/pubKeys/${anAssertionRef}/generate`,
      expect.objectContaining({
        body: JSON.stringify({ operation_id: aSignatureInput }),
        headers: expect.objectContaining({
          "X-Functions-Key": apiKey,
          "content-type": "application/json",
        }),
        method: "POST",
      }),
    );
  });

  it("throws an error when the API responds with an error", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      json: async () => aProblemJson,
      ok: false,
      status: 400,
    } as Response);

    await expect(
      client.generateLCParams(anAssertionRef, aSignatureInput),
    ).rejects.toEqual(
      expect.objectContaining({
        body: aProblemJson,
        message: `Error during generateLcParams with status ${aProblemJson.status}`,
      }),
    );

    expect(fetchSpy).toHaveBeenCalledWith(
      `${baseUrl}/pubKeys/${anAssertionRef}/generate`,
      expect.objectContaining({
        body: JSON.stringify({ operation_id: aSignatureInput }),
        headers: expect.objectContaining({
          "X-Functions-Key": apiKey,
          "content-type": "application/json",
        }),
        method: "POST",
      }),
    );

    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("should throw an error if fetch fails", async () => {
    const returnedError = new Error("Network error");
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockRejectedValueOnce(returnedError);

    await expect(
      client.generateLCParams(anAssertionRef, aSignatureInput),
    ).rejects.toEqual(
      expect.objectContaining({
        message: "Error during generatLcParams api call | Error: Network error",
      }),
    );

    expect(fetchSpy).toHaveBeenCalledWith(
      `${baseUrl}/pubKeys/${anAssertionRef}/generate`,
      expect.objectContaining({
        body: JSON.stringify({ operation_id: aSignatureInput }),
        headers: expect.objectContaining({
          "X-Functions-Key": apiKey,
          "content-type": "application/json",
        }),
        method: "POST",
      }),
    );

    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });
});
