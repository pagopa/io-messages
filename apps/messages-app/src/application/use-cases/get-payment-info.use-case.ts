import { UseCase } from "@pagopa/hexagonal-core";
import { PaymentInfo } from "io-messages-common/domain/payment";

import {
  PaymentInfoError,
  PaymentInfoRepository,
} from "../ports/payment-info.js";

export interface GetPaymentInfoInput {
  isTest: boolean;
  rptId: string;
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
