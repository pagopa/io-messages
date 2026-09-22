import type { Result } from "neverthrow";

import { BaseError, GenericError } from "@pagopa/hexagonal-core";
import { PaymentInfo } from "io-messages-common/domain/payment";

import type {
  GatewayFaultPaymentProblemJson,
  PartyConfigurationFaultPaymentProblemJson,
  PaymentCanceledStatusFaultPaymentProblemJson,
  PaymentDuplicatedStatusFaultPaymentProblemJson,
  PaymentExpiredStatusFaultPaymentProblemJson,
  PaymentOngoingStatusFaultPaymentProblemJson,
  ProblemJson,
  ValidationFaultPaymentDataErrorProblemJson,
  ValidationFaultPaymentUnavailableProblemJson,
  ValidationFaultPaymentUnknownProblemJson,
} from "../../generated/pagopa-ecommerce/types.gen.js";

import { MalformedEntityError } from "./error.js";

export type PaymentInfoNotFoundResponse =
  | ValidationFaultPaymentDataErrorProblemJson
  | ValidationFaultPaymentUnknownProblemJson;

export type PaymentInfoConflictResponse =
  | PaymentCanceledStatusFaultPaymentProblemJson
  | PaymentDuplicatedStatusFaultPaymentProblemJson
  | PaymentExpiredStatusFaultPaymentProblemJson
  | PaymentOngoingStatusFaultPaymentProblemJson;

export type PaymentInfoBadGatewayResponse =
  | GatewayFaultPaymentProblemJson
  | ValidationFaultPaymentUnavailableProblemJson;

export type PaymentInfoUpstreamStatus = 404 | 409 | 502 | 503;

export type PaymentInfoUpstreamBody =
  | PartyConfigurationFaultPaymentProblemJson
  | PaymentInfoBadGatewayResponse
  | PaymentInfoConflictResponse
  | PaymentInfoNotFoundResponse;

export class PaymentInfoUpstreamError extends BaseError {
  override readonly kind = "PaymentInfoUpstreamError" as const;
  override tag = "payment-info-upstream-error";

  constructor(
    readonly status: PaymentInfoUpstreamStatus,
    readonly body: PaymentInfoUpstreamBody,
  ) {
    super(`PagoPA Ecommerce returned ${status}`);
  }
}

export class PaymentInfoInternalError extends BaseError {
  override readonly kind = "PaymentInfoInternalError" as const;
  override tag = "payment-info-internal-error";

  constructor(readonly body: ProblemJson) {
    super(body.detail ?? "Unexpected error from PagoPA Ecommerce API");
  }
}

export type PaymentInfoError =
  | GenericError
  | MalformedEntityError
  | PaymentInfoInternalError
  | PaymentInfoUpstreamError;

export interface PaymentInfoRepository {
  getPaymentInfo(
    rptId: string,
    isTest: boolean,
  ): Promise<Result<PaymentInfo, PaymentInfoError>>;
}
