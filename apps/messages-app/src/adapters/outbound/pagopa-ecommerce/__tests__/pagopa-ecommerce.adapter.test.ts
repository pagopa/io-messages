import {
  BadGatewayError,
  ConflictError,
  GenericError,
  NotFoundError,
  ServiceUnavailableError,
} from "@pagopa/hexagonal-core";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { MalformedEntityError } from "../../../../application/ports/error.js";
import { PagoPAEcommerceHttpClientAdapter } from "../pagopa-ecommerce.js";

const rptId = "12345678901234567890123456789012345";

const paymentInfo = {
  amount: 11400,
  description: "Payment description",
  dueDate: "2025-05-31",
  paFiscalCode: "12345678901",
  paName: "PagoPA Test PA",
  rptId,
};

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json" },
    status,
  });

const fetchMock = vi.fn<typeof fetch>();

const adapter = new PagoPAEcommerceHttpClientAdapter(
  {
    apiKey: "production-api-key",
    baseURL: new URL("https://pagopa.example/ecommerce"),
  },
  {
    apiKey: "uat-api-key",
    baseURL: new URL("https://uat.pagopa.example"),
  },
);

describe("PagoPAEcommerceHttpClientAdapter", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    fetchMock.mockResolvedValue(jsonResponse(paymentInfo));
    vi.stubGlobal("fetch", fetchMock);
  });

  it("uses the production environment when test mode is disabled", async () => {
    const result = await adapter.getPaymentInfo(rptId, false);

    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap()).toEqual(paymentInfo);
    expect(fetchMock).toHaveBeenCalledWith(
      `https://pagopa.example/ecommerce/payment-requests/${rptId}`,
      {
        headers: {
          "Ocp-Apim-Subscription-Key": "production-api-key",
        },
      },
    );
  });

  it("uses the UAT environment when test mode is enabled", async () => {
    const result = await adapter.getPaymentInfo(rptId, true);

    expect(result.isOk()).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      `https://uat.pagopa.example/payment-requests/${rptId}`,
      {
        headers: {
          "Ocp-Apim-Subscription-Key": "uat-api-key",
        },
      },
    );
  });

  it("returns a MalformedEntityError when the response is not valid JSON", async () => {
    fetchMock.mockResolvedValue(
      new Response("not-a-json", {
        headers: { "Content-Type": "application/json" },
        status: 200,
      }),
    );

    const result = await adapter.getPaymentInfo(rptId, false);

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(MalformedEntityError);
  });

  it("returns a MalformedEntityError when the response does not match the schema", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ ...paymentInfo, amount: -1 }));

    const result = await adapter.getPaymentInfo(rptId, false);

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(MalformedEntityError);
  });

  it.each([
    [400, GenericError],
    [401, GenericError],
    [404, NotFoundError],
    [409, ConflictError],
    [502, BadGatewayError],
    [503, ServiceUnavailableError],
    [500, GenericError],
  ])("maps upstream status %s", async (status, errorClass) => {
    fetchMock.mockResolvedValue(jsonResponse({ title: "error" }, status));

    const result = await adapter.getPaymentInfo(rptId, false);

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(errorClass);
  });

  it("returns a GenericError when fetch rejects", async () => {
    fetchMock.mockRejectedValue(new Error("network error"));

    const result = await adapter.getPaymentInfo(rptId, false);

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(GenericError);
  });
});
