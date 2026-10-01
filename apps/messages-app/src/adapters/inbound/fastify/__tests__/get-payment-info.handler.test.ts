import type { FastifyInstance } from "fastify";

import { GenericError } from "@pagopa/hexagonal-core";
import fastify from "fastify";
import { PaymentInfo } from "io-messages-common/domain/payment";
import { err, ok } from "neverthrow";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { GetPaymentInfoUseCase } from "../../../../application/use-cases/get-payment-info.use-case.js";

import {
  PaymentInfoInternalError,
  PaymentInfoUpstreamError,
} from "../../../../application/ports/payment-info.js";
import { mountGetPaymentInfoHandler } from "../get-payment-info.handler.js";

const rptId = "12345678901234567890123456789012345";

const paymentInfo: PaymentInfo = {
  amount: 11400,
  description: "Payment description",
  dueDate: "2025-05-31",
  paFiscalCode: "12345678901",
  paName: "PagoPA Test PA",
  rptId,
};

describe("mountGetPaymentInfoHandler", () => {
  let server: FastifyInstance;
  let useCase: GetPaymentInfoUseCase;

  beforeEach(() => {
    server = fastify();
    useCase = vi.fn().mockResolvedValue(ok(paymentInfo));
    mountGetPaymentInfoHandler(server, useCase);
  });

  afterEach(async () => {
    await server.close();
  });

  it("maps a valid payment-info request", async () => {
    const response = await server.inject({
      method: "GET",
      url: `/api/payments/${rptId}?test=TRUE`,
    });

    expect(response.statusCode).toBe(200);
    expect(useCase).toHaveBeenCalledWith({
      isTest: true,
      rptId,
    });
    expect(response.json()).toEqual(paymentInfo);
  });

  it("defaults test mode to false", async () => {
    const response = await server.inject({
      method: "GET",
      url: `/api/payments/${rptId}`,
    });

    expect(response.statusCode).toBe(200);
    expect(useCase).toHaveBeenCalledWith({
      isTest: false,
      rptId,
    });
  });

  it("returns 400 when rpt_id is invalid", async () => {
    const response = await server.inject({
      method: "GET",
      url: "/api/payments/not-valid!",
    });

    expect(response.statusCode).toBe(400);
    expect(response.headers["content-type"]).toContain(
      "application/problem+json",
    );
    expect(useCase).not.toHaveBeenCalled();
  });

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
    "returns the documented %s payment error body",
    async (statusCode, body) => {
      vi.mocked(useCase).mockResolvedValue(
        err(new PaymentInfoUpstreamError(statusCode, body)),
      );

      const response = await server.inject({
        method: "GET",
        url: `/api/payments/${rptId}`,
      });

      expect(response.statusCode).toBe(statusCode);
      expect(response.headers["content-type"]).toContain(
        "application/problem+json",
      );
      expect(response.json()).toEqual(body);
    },
  );

  it("returns the default ProblemJson for generic internal errors", async () => {
    vi.mocked(useCase).mockResolvedValue(err(new GenericError("failed")));

    const response = await server.inject({
      method: "GET",
      url: `/api/payments/${rptId}`,
    });

    expect(response.statusCode).toBe(500);
    expect(response.headers["content-type"]).toContain(
      "application/problem+json",
    );
    expect(response.json()).toEqual({
      detail: "Unexpected error from PagoPA Ecommerce API",
      status: 500,
      title: "Internal server error",
    });
  });

  it("returns the documented internal ProblemJson body", async () => {
    const body = {
      detail: "Formally invalid input",
      status: 400,
      title: "Bad Request",
      type: "https://example.test/payment-error",
    };
    vi.mocked(useCase).mockResolvedValue(
      err(new PaymentInfoInternalError(body)),
    );

    const response = await server.inject({
      method: "GET",
      url: `/api/payments/${rptId}`,
    });

    expect(response.statusCode).toBe(500);
    expect(response.headers["content-type"]).toContain(
      "application/problem+json",
    );
    expect(response.json()).toEqual(body);
  });
});
