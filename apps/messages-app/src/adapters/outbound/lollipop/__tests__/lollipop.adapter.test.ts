import {
  ForbiddenError,
  GenericError,
  NotFoundError,
  ValidationError,
} from "@pagopa/hexagonal-core";
import {
  anAssertionRef,
  anLcParams,
} from "io-messages-common/adapters/lollipop/__mocks__/lollipop";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { MalformedEntityError } from "../../../../application/ports/error.js";
import { LollipopHttpClientAdapter } from "../lollipop.adapter.js";

const anOperationId = "anOperationId";

const lcParamsWireBody = {
  ...anLcParams,
  expired_at: anLcParams.expired_at.toISOString(),
};

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json" },
    status,
  });

const fetchMock = vi.fn<typeof fetch>();

const expectFetchRequest = (url: string, apiKey: string) => {
  const request = fetchMock.mock.calls[0]?.[0];

  expect(request).toBeInstanceOf(Request);
  expect((request as Request).url).toBe(url);
  expect((request as Request).headers.get("X-Functions-Key")).toBe(apiKey);
};

const adapter = new LollipopHttpClientAdapter(
  "an-api-key",
  new URL("https://lollipop.example/api/v1"),
);

describe("LollipopHttpClientAdapter", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    fetchMock.mockResolvedValue(jsonResponse(lcParamsWireBody));
    vi.stubGlobal("fetch", fetchMock);
  });

  it("returns LcParams on a successful call", async () => {
    const result = await adapter.generateLcParams(
      anAssertionRef,
      anOperationId,
    );

    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap()).toEqual(anLcParams);
    expectFetchRequest(
      `https://lollipop.example/api/v1/pubKeys/${encodeURIComponent(anAssertionRef)}/generate`,
      "an-api-key",
    );
  });

  it("returns a MalformedEntityError when the response is not valid JSON", async () => {
    fetchMock.mockResolvedValue(
      new Response("not-a-json", {
        headers: { "Content-Type": "application/json" },
        status: 200,
      }),
    );

    const result = await adapter.generateLcParams(
      anAssertionRef,
      anOperationId,
    );

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(MalformedEntityError);
  });

  it("returns a MalformedEntityError when the response does not match the schema", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ ...lcParamsWireBody, ttl: "not-a-number" }),
    );

    const result = await adapter.generateLcParams(
      anAssertionRef,
      anOperationId,
    );

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(MalformedEntityError);
  });

  it("maps status 400 to ValidationError", async () => {
    const body = {
      detail: "Formally invalid input",
      status: 400,
      title: "Bad Request",
      type: "https://example.test/lollipop-error",
    };
    fetchMock.mockResolvedValue(jsonResponse(body, 400));

    const result = await adapter.generateLcParams(
      anAssertionRef,
      anOperationId,
    );

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(ValidationError);
  });

  it("maps status 500 to GenericError", async () => {
    const body = {
      detail: "Unexpected failure",
      status: 500,
      title: "Internal Server Error",
    };
    fetchMock.mockResolvedValue(jsonResponse(body, 500));

    const result = await adapter.generateLcParams(
      anAssertionRef,
      anOperationId,
    );

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(GenericError);
  });

  it("maps status 403 to ForbiddenError", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 403 }));

    const result = await adapter.generateLcParams(
      anAssertionRef,
      anOperationId,
    );

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(ForbiddenError);
  });

  it("maps status 404 to NotFoundError", async () => {
    const body = {
      detail: "Pub key not found",
      status: 404,
      title: "Not Found",
    };
    fetchMock.mockResolvedValue(jsonResponse(body, 404));

    const result = await adapter.generateLcParams(
      anAssertionRef,
      anOperationId,
    );

    expect(result.isErr()).toBe(true);

    const error = result._unsafeUnwrapErr();
    expect(error).toBeInstanceOf(NotFoundError);
    expect(error).toMatchObject({ entityName: "LcParams" });
    expect(error.message).toContain(body.detail);
  });

  it("returns a GenericError when fetch rejects", async () => {
    fetchMock.mockRejectedValue(new Error("network error"));

    const result = await adapter.generateLcParams(
      anAssertionRef,
      anOperationId,
    );

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(GenericError);
  });
});
