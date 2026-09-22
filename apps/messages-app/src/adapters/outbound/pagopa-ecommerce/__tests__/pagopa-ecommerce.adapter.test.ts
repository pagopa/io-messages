import { GenericError } from "@pagopa/hexagonal-core";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { MalformedEntityError } from "../../../../application/ports/error.js";
import {
  PaymentInfoInternalError,
  PaymentInfoUpstreamError,
} from "../../../../application/ports/payment-info.js";
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

const expectFetchRequest = (url: string, apiKey: string) => {
  const request = fetchMock.mock.calls[0]?.[0];

  expect(request).toBeInstanceOf(Request);
  expect((request as Request).url).toBe(url);
  expect((request as Request).headers.get("Ocp-Apim-Subscription-Key")).toBe(
    apiKey,
  );
};

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
    expectFetchRequest(
      `https://pagopa.example/ecommerce/payment-requests/${rptId}`,
      "production-api-key",
    );
  });

  it("uses the UAT environment when test mode is enabled", async () => {
    const result = await adapter.getPaymentInfo(rptId, true);

    expect(result.isOk()).toBe(true);
    expectFetchRequest(
      `https://uat.pagopa.example/payment-requests/${rptId}`,
      "uat-api-key",
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
    [
      400,
      {
        detail: "Formally invalid input",
        status: 400,
        title: "Bad Request",
        type: "https://example.test/payment-error",
      },
      {
        detail: "Formally invalid input",
        status: 400,
        title: "Bad Request",
        type: "https://example.test/payment-error",
      },
    ],
    [
      401,
      {},
      {
        detail: "Unexpected error from PagoPA Ecommerce API",
        status: 401,
        title: "Internal server error",
      },
    ],
    [
      500,
      {},
      {
        detail: "Unexpected error from PagoPA Ecommerce API",
        status: 500,
        title: "Internal server error",
      },
    ],
  ] as const)(
    "maps upstream status %s to internal ProblemJson",
    async (status, upstreamBody, expectedBody) => {
      fetchMock.mockResolvedValue(jsonResponse(upstreamBody, status));

      const result = await adapter.getPaymentInfo(rptId, false);

      expect(result.isErr()).toBe(true);

      const error = result._unsafeUnwrapErr();
      expect(error).toBeInstanceOf(PaymentInfoInternalError);
      expect(error).toMatchObject({ body: expectedBody });
    },
  );

  it.each([
    [
      404,
      {
        faultCodeCategory: "PAYMENT_UNKNOWN",
        faultCodeDetail: "PAA_PAGAMENTO_SCONOSCIUTO",
      },
    ],
    [
      409,
      {
        faultCodeCategory: "PAYMENT_ONGOING",
        faultCodeDetail: "PAA_PAGAMENTO_IN_CORSO",
      },
    ],
    [
      502,
      {
        faultCodeCategory: "GENERIC_ERROR",
        faultCodeDetail: "PPT_SYSTEM_ERROR",
      },
    ],
    [
      503,
      {
        faultCodeCategory: "DOMAIN_UNKNOWN",
        faultCodeDetail: "PAA_SYSTEM_ERROR",
      },
    ],
  ] as const)(
    "preserves upstream status %s payment error body",
    async (status, body) => {
      fetchMock.mockResolvedValue(jsonResponse(body, status));

      const result = await adapter.getPaymentInfo(rptId, false);

      expect(result.isErr()).toBe(true);

      const error = result._unsafeUnwrapErr();
      expect(error).toBeInstanceOf(PaymentInfoUpstreamError);
      expect(error).toMatchObject({ body, status });
    },
  );

  it("returns a GenericError when fetch rejects", async () => {
    fetchMock.mockRejectedValue(new Error("network error"));

    const result = await adapter.getPaymentInfo(rptId, false);

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(GenericError);
  });
});
