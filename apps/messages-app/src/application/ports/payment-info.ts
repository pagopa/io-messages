import type { Result } from "neverthrow";

import {
  BadGatewayError,
  ConflictError,
  GenericError,
  NotFoundError,
  ServiceUnavailableError,
} from "@pagopa/hexagonal-core";
import { PaymentInfo } from "io-messages-common/domain/payment";

import { MalformedEntityError } from "./error.js";

export type PaymentInfoError =
  | BadGatewayError
  | ConflictError
  | GenericError
  | MalformedEntityError
  | NotFoundError
  | ServiceUnavailableError;

export interface PaymentInfoRepository {
  getPaymentInfo(
    rptId: string,
    isTest: boolean,
  ): Promise<Result<PaymentInfo, PaymentInfoError>>;
}
