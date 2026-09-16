import type { FastifyInstance } from "fastify";

import { ProblemDetailsSchema, defineRoute } from "@pagopa/hexagonal-core";
import { mountFastifyRoute } from "@pagopa/hexagonal-fastify";
import z from "zod";

import { rptIdSchema } from "../../../application/ports/payment-info.js";
import { GetPaymentInfoUseCase } from "../../../application/use-cases/get-payment-info.use-case.js";
import {
  GetPaymentInfoResponseSchema,
  toGetPaymentInfoResponse,
} from "./dto/get-payment-info.dto.js";
import { makePaymentInfoAuthorizationMiddleware } from "./middlewares/payment-info-authorization.middleware.js";

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
    403: ProblemDetailsSchema,
    404: ProblemDetailsSchema,
    409: ProblemDetailsSchema,
    500: ProblemDetailsSchema,
    502: ProblemDetailsSchema,
    503: ProblemDetailsSchema,
  },
});

export const mountGetPaymentInfoHandler = (
  server: FastifyInstance,
  useCase: GetPaymentInfoUseCase,
): void => {
  mountFastifyRoute(server, {
    contract: getPaymentInfoContract,
    inputMapper: (request, context) => ({
      isTest: request.query.test,
      rptId: request.path.rpt_id,
      subscriptionId: context.subscriptionId,
      userId: context.userId,
    }),
    middlewares: [makePaymentInfoAuthorizationMiddleware()],
    outputMapper: toGetPaymentInfoResponse,
    useCase,
  });
};
