import {
  BadGatewayError,
  ConflictError,
  GenericError,
  NotFoundError,
  ServiceUnavailableError,
} from "@pagopa/hexagonal-core";
import {
  PaymentInfo,
  paymentInfoSchema,
} from "io-messages-common/domain/payment";
import { Result, err, ok } from "neverthrow";

import { MalformedEntityError } from "../../../application/ports/error.js";
import {
  PaymentInfoError,
  PaymentInfoRepository,
} from "../../../application/ports/payment-info.js";
import { createClient } from "../../../generated/pagopa-ecommerce/client/index.js";
import { getPaymentRequestInfo } from "../../../generated/pagopa-ecommerce/sdk.gen.js";

interface PagoPAEcommerceEnvironment {
  apiKey: string;
  baseURL: URL;
}

const toErrorBody = (error: unknown): string => {
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message;

  try {
    return JSON.stringify(error);
  } catch {
    return "unreadable response body";
  }
};

export class PagoPAEcommerceHttpClientAdapter implements PaymentInfoRepository {
  constructor(
    private readonly productionEnvironment: PagoPAEcommerceEnvironment,
    private readonly uatEnvironment: PagoPAEcommerceEnvironment,
  ) {}

  async getPaymentInfo(
    rptId: string,
    isTest: boolean,
  ): Promise<Result<PaymentInfo, PaymentInfoError>> {
    const environment = isTest
      ? this.uatEnvironment
      : this.productionEnvironment;

    const response = await getPaymentRequestInfo({
      auth: environment.apiKey,
      client: createClient({
        baseUrl: environment.baseURL.toString(),
      }),
      path: {
        rpt_id: rptId,
      },
    });

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
          new GenericError(
            `malformed payment info request for rptId ${rptId}: ${toErrorBody(response.error)}`,
          ),
        );

      case 401:
        return err(
          new GenericError(
            `unauthorized pagopa ecommerce request for rptId ${rptId}`,
          ),
        );

      case 404:
        return err(
          new NotFoundError(
            "payment info",
            `cannot find payment info for rptId ${rptId}`,
          ),
        );

      case 409:
        return err(
          new ConflictError(
            `conflict retrieving payment info for rptId ${rptId}`,
          ),
        );

      case 502:
        return err(
          new BadGatewayError(
            `bad gateway retrieving payment info for rptId ${rptId}`,
          ),
        );

      case 503:
        return err(
          new ServiceUnavailableError(
            `pagopa ecommerce unavailable retrieving payment info for rptId ${rptId}`,
          ),
        );

      default:
        return err(
          new GenericError(
            `unexpected pagopa ecommerce response for rptId ${rptId}: ${response.response.status}`,
          ),
        );
    }
  }
}
