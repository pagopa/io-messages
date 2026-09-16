import { UseCase } from "@pagopa/hexagonal-core";

import {
  PaymentInfo,
  PaymentInfoError,
  PaymentInfoRepository,
} from "../ports/payment-info.js";

export interface GetPaymentInfoInput {
  isTest: boolean;
  rptId: string;
  subscriptionId?: string;
  userId?: string;
}

export type GetPaymentInfoUseCase = UseCase<
  GetPaymentInfoInput,
  PaymentInfo,
  PaymentInfoError
>;

export const makeGetPaymentInfoUseCase =
  (paymentInfoRepository: PaymentInfoRepository): GetPaymentInfoUseCase =>
  async ({ isTest, rptId }) =>
    paymentInfoRepository.getPaymentInfo(rptId, isTest);
