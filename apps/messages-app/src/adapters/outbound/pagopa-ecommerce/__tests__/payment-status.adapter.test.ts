import { GenericError } from "@pagopa/hexagonal-core";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PagoPaEcommercePaymentStatusAdapter } from "../payment-status.adapter.js";

const rptId = "01234567890012345678901234567";
const baseURL = new URL("http://localhost:8010/api/v1");
const adapter = new PagoPaEcommercePaymentStatusAdapter(baseURL, "api-key");

const response = (status: number, body: unknown = {}): Response =>
  ({ json: vi.fn().mockResolvedValue(body), status }) as unknown as Response;

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
  ] as const)("maps status %s to %s", async (status, body, expected) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response(status, body)));

    const result = await adapter.getPaymentStatus(rptId);

    expect(result._unsafeUnwrap()).toBe(expected);
    expect(fetch).toHaveBeenCalledWith(
      new URL(`${baseURL}/payment-requests/${rptId}`),
      expect.objectContaining({
        headers: { "Ocp-Apim-Subscription-Key": "api-key" },
        signal: expect.any(AbortSignal),
      }),
    );
  });

  it.each([
    ["PAYMENT_DUPLICATED", "PAA_PAGAMENTO_DUPLICATO", "PAID"],
    ["PAYMENT_ONGOING", "PPT_PAGAMENTO_IN_CORSO", "NOT_PAID"],
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
    [500, {}],
    [200, {}],
    [404, {}],
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

  it("returns GenericError when a response body is not valid JSON", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        json: vi.fn().mockRejectedValue(new SyntaxError("invalid JSON")),
        status: 409,
      } as unknown as Response),
    );

    const result = await adapter.getPaymentStatus(rptId);

    expect(result._unsafeUnwrapErr()).toBeInstanceOf(GenericError);
  });
});
