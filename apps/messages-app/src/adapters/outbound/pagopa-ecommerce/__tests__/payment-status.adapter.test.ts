import { GenericError } from "@pagopa/hexagonal-core";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PagoPaEcommercePaymentStatusAdapter } from "../payment-status.adapter.js";

const rptId = "01234567890012345678901234567";
const baseURL = new URL("http://localhost:8010/api/v1");
const adapter = new PagoPaEcommercePaymentStatusAdapter(baseURL, "api-key");

const response = (status: number, body: unknown = {}): Response =>
  new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json" },
    status,
  });

const getRequest = (): Request => {
  const request = vi.mocked(fetch).mock.calls[0]?.[0];
  if (!(request instanceof Request)) {
    throw new Error("Expected the generated client to send a Request");
  }
  return request;
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("PagoPaEcommercePaymentStatusAdapter", () => {
  it.each([
    [200, { amount: 100 }, "NOT_PAID"],
    [
      404,
      {
        faultCodeCategory: "PAYMENT_UNKNOWN",
        faultCodeDetail: "PAA_PAGAMENTO_SCONOSCIUTO",
      },
      "NOT_PAID",
    ],
    [
      404,
      {
        faultCodeCategory: "PAYMENT_DATA_ERROR",
        faultCodeDetail: "PPT_DOMINIO_SCONOSCIUTO",
      },
      "NOT_PAID",
    ],
  ] as const)("maps status %s to %s", async (status, body, expected) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response(status, body)));

    const result = await adapter.getPaymentStatus(rptId);

    expect(result._unsafeUnwrap()).toBe(expected);
    const request = getRequest();
    expect(request.url).toBe(`${baseURL}/payment-requests/${rptId}`);
    expect(request.method).toBe("GET");
    expect(request.redirect).toBe("manual");
    expect(request.headers.get("Ocp-Apim-Subscription-Key")).toBe("api-key");
    expect(request.signal).toBeInstanceOf(AbortSignal);
  });

  it.each([
    ["PAYMENT_DUPLICATED", "PAA_PAGAMENTO_DUPLICATO", "PAID"],
    ["PAYMENT_DUPLICATED", "PPT_PAGAMENTO_DUPLICATO", "PAID"],
    ["PAYMENT_ONGOING", "PPT_PAGAMENTO_IN_CORSO", "NOT_PAID"],
    ["PAYMENT_ONGOING", "PAA_PAGAMENTO_IN_CORSO", "NOT_PAID"],
    ["PAYMENT_EXPIRED", "PAA_PAGAMENTO_SCADUTO", "NOT_PAID"],
    ["PAYMENT_CANCELED", "PAA_PAGAMENTO_ANNULLATO", "NOT_PAID"],
  ] as const)(
    "maps conflict %s to %s",
    async (category, faultCodeDetail, expected) => {
      vi.stubGlobal(
        "fetch",
        vi
          .fn()
          .mockResolvedValue(
            response(409, { faultCodeCategory: category, faultCodeDetail }),
          ),
      );

      const result = await adapter.getPaymentStatus(rptId);

      expect(result._unsafeUnwrap()).toBe(expected);
    },
  );

  it.each([
    [302, {}],
    [400, {}],
    [401, {}],
    [500, {}],
    [502, {}],
    [503, {}],
    [200, {}],
    [200, { amount: -1 }],
    [404, {}],
    [
      404,
      {
        faultCodeCategory: "PAYMENT_DUPLICATED",
        faultCodeDetail: "PAA_PAGAMENTO_DUPLICATO",
      },
    ],
    [409, {}],
    [409, { faultCodeCategory: "PAYMENT_DUPLICATED" }],
    [
      409,
      {
        faultCodeCategory: "PAYMENT_DUPLICATED",
        faultCodeDetail: "PPT_PAGAMENTO_IN_CORSO",
      },
    ],
  ])("returns GenericError for invalid response %s", async (status, body) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response(status, body)));

    const result = await adapter.getPaymentStatus(rptId);

    expect(result._unsafeUnwrapErr()).toBeInstanceOf(GenericError);
  });

  it("returns GenericError when the request fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));

    const result = await adapter.getPaymentStatus(rptId);

    expect(result._unsafeUnwrapErr()).toBeInstanceOf(GenericError);
  });

  it("sets the PagoPA request timeout to 10 seconds", async () => {
    const signal = new AbortController().signal;
    const timeout = vi.spyOn(AbortSignal, "timeout").mockReturnValue(signal);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(response(200, { amount: 100 })),
    );

    const result = await adapter.getPaymentStatus(rptId);

    expect(result._unsafeUnwrap()).toBe("NOT_PAID");
    expect(timeout).toHaveBeenCalledWith(10_000);
  });

  it.each([200, 404, 409])(
    "returns GenericError when a %s response body is not valid JSON",
    async (status) => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(
          new Response("invalid JSON", {
            headers: { "Content-Type": "application/json" },
            status,
          }),
        ),
      );

      const result = await adapter.getPaymentStatus(rptId);

      expect(result._unsafeUnwrapErr()).toBeInstanceOf(GenericError);
    },
  );

  it("accepts a payment response with optional metadata", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        response(200, {
          amount: 100,
          description: "Payment description",
          dueDate: "2026-12-01",
          paFiscalCode: "01234567890",
          paName: "Test PA",
          rptId,
        }),
      ),
    );

    const result = await adapter.getPaymentStatus(rptId);

    expect(result._unsafeUnwrap()).toBe("NOT_PAID");
  });

  it("preserves the base URL across requests and normalizes trailing slashes", async () => {
    const configuredURL = new URL("http://localhost:8010/api/v1///");
    const paymentStatusAdapter = new PagoPaEcommercePaymentStatusAdapter(
      configuredURL,
      "api-key",
    );
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(async () => response(200, { amount: 100 })),
    );

    await paymentStatusAdapter.getPaymentStatus(rptId);
    await paymentStatusAdapter.getPaymentStatus("another-rpt-id");

    expect(
      vi
        .mocked(fetch)
        .mock.calls.map(([request]) =>
          request instanceof Request ? request.url : undefined,
        ),
    ).toEqual([
      `http://localhost:8010/api/v1/payment-requests/${rptId}`,
      "http://localhost:8010/api/v1/payment-requests/another-rpt-id",
    ]);
    expect(configuredURL.href).toBe("http://localhost:8010/api/v1///");
  });

  it("returns GenericError if the request times out while receiving the body", async () => {
    const controller = new AbortController();
    vi.spyOn(AbortSignal, "timeout").mockReturnValue(controller.signal);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(async () => {
        controller.abort(
          new DOMException("The operation timed out", "TimeoutError"),
        );
        return response(200, { amount: 100 });
      }),
    );

    const result = await adapter.getPaymentStatus(rptId);

    expect(result._unsafeUnwrapErr()).toBeInstanceOf(GenericError);
  });
});
