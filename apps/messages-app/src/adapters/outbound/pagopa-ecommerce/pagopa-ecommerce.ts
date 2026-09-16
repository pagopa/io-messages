import {
  BadGatewayError,
  ConflictError,
  GenericError,
  NotFoundError,
  ServiceUnavailableError,
} from "@pagopa/hexagonal-core";
import { Result, ResultAsync, err, ok } from "neverthrow";

import { MalformedEntityError } from "../../../application/ports/error.js";
import {
  PaymentInfo,
  PaymentInfoError,
  PaymentInfoRepository,
  paymentInfoSchema,
} from "../../../application/ports/payment-info.js";

interface PagoPAEcommerceEnvironment {
  apiKey: string;
  baseURL: URL;
}

const getResponseBody = async (response: Response): Promise<string> => {
  try {
    return await response.text();
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
    const paymentInfoURL = new URL(environment.baseURL);
    paymentInfoURL.pathname = `${paymentInfoURL.pathname.replace(/\/$/, "")}/payment-requests/${rptId}`;

    const response = await ResultAsync.fromPromise(
      fetch(paymentInfoURL.toString(), {
        headers: {
          "Ocp-Apim-Subscription-Key": environment.apiKey,
        },
      }),
      (error) => new GenericError(String(error)),
    );

    if (response.isErr()) return err(response.error);

    switch (response.value.status) {
      case 200: {
        const jsonResponse = await ResultAsync.fromPromise(
          response.value.json(),
          () =>
            new MalformedEntityError(
              "invalid json response from pagopa ecommerce",
            ),
        );

        if (jsonResponse.isErr()) return err(jsonResponse.error);

        const parsedResult = paymentInfoSchema.safeParse(jsonResponse.value);
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
            `malformed payment info request for rptId ${rptId}: ${await getResponseBody(response.value)}`,
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
            `unexpected pagopa ecommerce response for rptId ${rptId}: ${response.value.status}`,
          ),
        );
    }
  }
}
