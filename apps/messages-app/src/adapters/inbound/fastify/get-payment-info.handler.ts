import type { FastifyInstance } from "fastify";

import { ProblemDetailsSchema, defineRoute } from "@pagopa/hexagonal-core";
import { rptIdSchema } from "io-messages-common/domain/message";
import z from "zod";

import {
  PaymentInfoError,
  PaymentInfoInternalError,
  PaymentInfoUpstreamError,
} from "../../../application/ports/payment-info.js";
import { GetPaymentInfoUseCase } from "../../../application/use-cases/get-payment-info.use-case.js";
import {
  GetPaymentInfoResponseSchema,
  PartyConfigurationFaultPaymentProblemJson,
  PartyConfigurationFaultPaymentProblemJsonSchema,
  PaymentInfoBadGatewayResponse,
  PaymentInfoBadGatewayResponseSchema,
  PaymentInfoConflictResponse,
  PaymentInfoConflictResponseSchema,
  PaymentInfoInternalErrorResponse,
  PaymentInfoInternalErrorResponseSchema,
  PaymentInfoNotFoundResponse,
  PaymentInfoNotFoundResponseSchema,
  toGetPaymentInfoResponse,
} from "./dto/get-payment-info.dto.js";
import {
  HttpRouteOutput,
  mountFastifyHttpResultRoute,
} from "./mount-fastify-http-result-route.js";

type GetPaymentInfoHttpOutput =
  | HttpRouteOutput<404, PaymentInfoNotFoundResponse>
  | HttpRouteOutput<409, PaymentInfoConflictResponse>
  | HttpRouteOutput<500, PaymentInfoInternalErrorResponse>
  | HttpRouteOutput<502, PaymentInfoBadGatewayResponse>
  | HttpRouteOutput<503, PartyConfigurationFaultPaymentProblemJson>;

const getPaymentInfoContract = defineRoute({
  method: "get",
  path: "/api/payments/{rpt_id}",
  request: {
    path: z.object({
      rpt_id: rptIdSchema,
    }),
    query: z.object({
      test: z
        .preprocess(
          (value) => (typeof value === "string" ? value.toLowerCase() : value),
          z.enum(["true", "false"]),
        )
        .transform((value) => value === "true")
        .default(false),
    }),
  },
  response: {
    200: GetPaymentInfoResponseSchema,
    400: ProblemDetailsSchema,
    404: PaymentInfoNotFoundResponseSchema,
    409: PaymentInfoConflictResponseSchema,
    500: PaymentInfoInternalErrorResponseSchema,
    502: PaymentInfoBadGatewayResponseSchema,
    503: PartyConfigurationFaultPaymentProblemJsonSchema,
  },
});

const paymentInfoDefaultInternalErrorResponse: PaymentInfoInternalErrorResponse =
  {
    detail: "Unexpected error from PagoPA Ecommerce API",
    status: 500,
    title: "Internal server error",
  };

const toGetPaymentInfoHttpErrorOutput = (
  error: PaymentInfoError,
): GetPaymentInfoHttpOutput => {
  if (error instanceof PaymentInfoUpstreamError) {
    return {
      body: error.body,
      status: error.status,
    } as GetPaymentInfoHttpOutput;
  }

  if (error instanceof PaymentInfoInternalError) {
    return {
      body: error.body,
      status: 500,
    };
  }

  return {
    body: paymentInfoDefaultInternalErrorResponse,
    status: 500,
  };
};

export const mountGetPaymentInfoHandler = (
  server: FastifyInstance,
  useCase: GetPaymentInfoUseCase,
): void => {
  mountFastifyHttpResultRoute(server, {
    contract: getPaymentInfoContract,
    errorMapper: toGetPaymentInfoHttpErrorOutput,
    inputMapper: (request) => ({
      isTest: request.query.test,
      rptId: request.path.rpt_id,
    }),
    outputMapper: toGetPaymentInfoResponse,
    useCase,
  });
};
