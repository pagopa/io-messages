import type { FastifyInstance } from "fastify";

import {
  BadGatewayError,
  ConflictError,
  GenericError,
  NotFoundError,
  ServiceUnavailableError,
} from "@pagopa/hexagonal-core";
import fastify from "fastify";
import { PaymentInfo } from "io-messages-common/domain/payment";
import { err, ok } from "neverthrow";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { GetPaymentInfoUseCase } from "../../../../application/use-cases/get-payment-info.use-case.js";

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
    [new NotFoundError("payment info", "missing"), 404],
    [new ConflictError("payment conflict"), 409],
    [new GenericError("failed"), 500],
    [new BadGatewayError("pagopa bad gateway"), 502],
    [new ServiceUnavailableError("pagopa unavailable"), 503],
  ])("maps domain errors to problem responses", async (error, statusCode) => {
    vi.mocked(useCase).mockResolvedValue(err(error));

    const response = await server.inject({
      method: "GET",
      url: `/api/payments/${rptId}`,
    });

    expect(response.statusCode).toBe(statusCode);
    expect(response.headers["content-type"]).toContain(
      "application/problem+json",
    );
  });
});
