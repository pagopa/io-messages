import { GenericError } from "@pagopa/hexagonal-core";
import {
  PaymentInfo,
  paymentInfoSchema,
} from "io-messages-common/domain/payment";
import { Result, ResultAsync, err, ok } from "neverthrow";

import { MalformedEntityError } from "../../../application/ports/error.js";
import {
  PaymentInfoError,
  PaymentInfoInternalError,
  PaymentInfoRepository,
  PaymentInfoUpstreamBody,
  PaymentInfoUpstreamError,
  PaymentInfoUpstreamStatus,
} from "../../../application/ports/payment-info.js";
import {
  Client,
  createClient,
} from "../../../generated/pagopa-ecommerce/client/index.js";
import { getPaymentRequestInfo } from "../../../generated/pagopa-ecommerce/sdk.gen.js";
import { ProblemJson } from "../../../generated/pagopa-ecommerce/types.gen.js";

interface PagoPAEcommerceEnvironmentData {
  apiKey: string;
  baseURL: URL;
}
interface PagoPAEcommerceEnvironment {
  apiKey: string;
  client: Client;
}

const toErrorBody = (error: unknown): string => {
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message;

  const errorBody = Result.fromThrowable(
    () => JSON.stringify(error),
    () => undefined,
  )().unwrapOr(undefined);

  return errorBody ?? "unreadable response body";
};

const toPaymentInfoUpstreamError = (
  status: PaymentInfoUpstreamStatus,
  body: unknown,
): PaymentInfoError => {
  if (!body) {
    return new MalformedEntityError(
      `missing ${status} error response from pagopa ecommerce`,
    );
  }

  return new PaymentInfoUpstreamError(status, body as PaymentInfoUpstreamBody);
};

const toPaymentInfoInternalError = (
  status: number,
  error?: ProblemJson,
): PaymentInfoInternalError =>
  new PaymentInfoInternalError({
    detail: error?.detail ?? "Unexpected error from PagoPA Ecommerce API",
    instance: error?.instance,
    status,
    title: error?.title ?? "Internal server error",
    type: error?.type,
  });

export class PagoPAEcommerceHttpClientAdapter implements PaymentInfoRepository {
  private readonly productionClient: PagoPAEcommerceEnvironment;
  private readonly uatClient: PagoPAEcommerceEnvironment;

  constructor(
    private readonly productionEnvironment: PagoPAEcommerceEnvironmentData,
    private readonly uatEnvironment: PagoPAEcommerceEnvironmentData,
  ) {
    this.productionClient = {
      apiKey: this.productionEnvironment.apiKey,
      client: createClient({
        baseUrl: this.productionEnvironment.baseURL.toString(),
      }),
    };
    this.uatClient = {
      apiKey: this.uatEnvironment.apiKey,
      client: createClient({
        baseUrl: this.uatEnvironment.baseURL.toString(),
      }),
    };
  }

  async getPaymentInfo(
    rptId: string,
    isTest: boolean,
  ): Promise<Result<PaymentInfo, PaymentInfoError>> {
    const environment = isTest ? this.uatClient : this.productionClient;

    const paymentRequestInfoResult = await ResultAsync.fromPromise(
      getPaymentRequestInfo({
        auth: environment.apiKey,
        client: environment.client,
        path: {
          rpt_id: rptId,
        },
      }),
      (error) => new GenericError(toErrorBody(error)),
    );

    if (paymentRequestInfoResult.isErr())
      return err(paymentRequestInfoResult.error);

    const response = paymentRequestInfoResult.value;
    if (!response.response) {
      return err(new GenericError(toErrorBody(response.error)));
    }

    switch (response.response.status) {
      case 200: {
        if (!response.data) {
          return err(
            new MalformedEntityError(
              "invalid json response from pagopa ecommerce",
            ),
          );
        }

        const parsedResult = paymentInfoSchema.safeParse(response.data);
        if (!parsedResult.success) {
          return err(
            new MalformedEntityError(
              `invalid payment info from pagopa ecommerce: ${parsedResult.error.message}`,
            ),
          );
        }

        return ok(parsedResult.data);
      }

      case 400:
        return err(
          toPaymentInfoInternalError(
            response.response.status,
            response.error as ProblemJson,
          ),
        );

      case 401:
        return err(toPaymentInfoInternalError(response.response.status));

      case 404:
        return err(toPaymentInfoUpstreamError(404, response.error));

      case 409:
        return err(toPaymentInfoUpstreamError(409, response.error));

      case 502:
        return err(toPaymentInfoUpstreamError(502, response.error));

      case 503:
        return err(toPaymentInfoUpstreamError(503, response.error));

      default:
        return err(toPaymentInfoInternalError(response.response.status));
    }
  }
}
