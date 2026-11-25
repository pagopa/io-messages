import { GenericError } from "@pagopa/hexagonal-core";
import { PaymentInfo } from "io-messages-common/domain/payment";
import { err, ok } from "neverthrow";
import { describe, expect, it, vi } from "vitest";

import type { PaymentInfoRepository } from "../../ports/payment-info.js";

import { makeGetPaymentInfoUseCase } from "../get-payment-info.use-case.js";

const rptId = "12345678901234567890123456789012345";

const paymentInfo: PaymentInfo = {
  amount: 11400,
  description: "Payment description",
  dueDate: "2025-05-31",
  paFiscalCode: "12345678901",
  paName: "PagoPA Test PA",
  rptId: "12345678901234567890123456789012345",
};

const makeRepository = (): PaymentInfoRepository => ({
  getPaymentInfo: vi.fn().mockResolvedValue(ok(paymentInfo)),
});

describe("makeGetPaymentInfoUseCase", () => {
  it("returns payment info from the repository", async () => {
    const repository = makeRepository();
    const useCase = makeGetPaymentInfoUseCase(repository);

    const result = await useCase({ isTest: true, rptId });

    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap()).toEqual(paymentInfo);
    expect(repository.getPaymentInfo).toHaveBeenCalledWith(
      paymentInfo.rptId,
      true,
    );
  });

  it("returns repository errors", async () => {
    const error = new GenericError("pagopa unavailable");
    const repository = makeRepository();
    vi.mocked(repository.getPaymentInfo).mockResolvedValue(err(error));
    const useCase = makeGetPaymentInfoUseCase(repository);

    const result = await useCase({ isTest: false, rptId });

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBe(error);
  });
});
