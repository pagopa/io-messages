import { GenericError } from "@pagopa/hexagonal-core";
import { Result, err, ok } from "neverthrow";
import z from "zod";

import {
  PaymentStatus,
  PaymentStatusRepository,
} from "../../../application/ports/payment-status.js";
import {
  Client,
  createClient,
} from "../../../generated/pagopa-ecommerce/client/index.js";
import { getPaymentRequestInfo } from "../../../generated/pagopa-ecommerce/sdk.gen.js";
import { PaymentRequestsGetResponse } from "../../../generated/pagopa-ecommerce/types.gen.js";
import {
  zPaymentCanceledStatusFaultPaymentProblemJson,
  zPaymentDuplicatedStatusFaultPaymentProblemJson,
  zPaymentExpiredStatusFaultPaymentProblemJson,
  zPaymentOngoingStatusFaultPaymentProblemJson,
  zPaymentRequestsGetResponse,
  zValidationFaultPaymentDataErrorProblemJson,
  zValidationFaultPaymentUnknownProblemJson,
} from "../../../generated/pagopa-ecommerce/zod.gen.js";

const REQUEST_TIMEOUT_MS = 10_000;

// Hey API does not interpret Swagger 2.0's x-one-of extension as a union.
const paymentNotFoundSchema = z.union([
  zValidationFaultPaymentDataErrorProblemJson,
  zValidationFaultPaymentUnknownProblemJson,
]);

const paymentConflictSchema = z.union([
  zPaymentOngoingStatusFaultPaymentProblemJson,
  zPaymentExpiredStatusFaultPaymentProblemJson,
  zPaymentCanceledStatusFaultPaymentProblemJson,
  zPaymentDuplicatedStatusFaultPaymentProblemJson,
]);

export class PagoPaEcommercePaymentStatusAdapter
  implements PaymentStatusRepository
{
  readonly #client: Client;

  constructor(
    private baseURL: URL,
    private apiKey: string,
  ) {
    this.#client = createClient();
  }

  private validatePaymentSuccessResponse(
    response: PaymentRequestsGetResponse | undefined,
    rptId: string,
  ): Result<PaymentStatus, GenericError> {
    const parsedResponse = zPaymentRequestsGetResponse.safeParse(response);
    if (!parsedResponse.success) {
      return err(
        new GenericError(
          `malformed response retrieving payment status for rptId ${rptId}`,
        ),
      );
    }

    return ok("NOT_PAID");
  }

  async getPaymentStatus(
    rptId: string,
  ): Promise<Result<PaymentStatus, GenericError>> {
    const signal = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
    const response = await getPaymentRequestInfo({
      auth: this.apiKey,
      baseUrl: this.baseURL.toString().replace(/\/+$/, ""),
      client: this.#client,
      path: { rpt_id: rptId },
      redirect: "manual",
      signal,
    });

    if (signal.aborted) {
      return err(
        new GenericError(
          `error retrieving payment status for rptId ${rptId}: ${String(signal.reason)}`,
        ),
      );
    }

    if (!response.response) {
      return err(
        new GenericError(
          `error retrieving payment status for rptId ${rptId}: ${String(response.error)}`,
        ),
      );
    }

    const status = response.response.status;
    if (status === 200) {
      return this.validatePaymentSuccessResponse(response.data, rptId);
    }

    if (status === 404 || status === 409) {
      const parsedResponse =
        status === 404
          ? paymentNotFoundSchema.safeParse(response.error)
          : paymentConflictSchema.safeParse(response.error);
      if (!parsedResponse.success) {
        return err(
          new GenericError(
            `malformed response retrieving payment status for rptId ${rptId}`,
          ),
        );
      }

      return ok(
        parsedResponse.data.faultCodeCategory === "PAYMENT_DUPLICATED"
          ? "PAID"
          : "NOT_PAID",
      );
    }

    return err(
      new GenericError(
        `unexpected response retrieving payment status for rptId ${rptId}: ${status}`,
      ),
    );
  }
}
