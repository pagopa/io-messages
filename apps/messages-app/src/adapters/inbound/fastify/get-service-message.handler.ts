import type { FastifyInstance } from "fastify";

import {
  FiscalCodeSchema,
  ProblemDetailsSchema,
  defineRoute,
} from "@pagopa/hexagonal-core";
import { mountFastifyRoute } from "@pagopa/hexagonal-fastify";
import z from "zod";

import { GetServiceMessageUseCase } from "../../../application/use-cases/get-service-message.use-case.js";
import {
  GetServiceMessageResponseSchema,
  toGetServiceMessageResponse,
} from "./dto/get-service-message.dto.js";

const getServiceMessageContract = defineRoute({
  method: "get",
  path: "/api/services/messages/{fiscal_code}/{id}",
  request: {
    headers: z.object({
      "x-service-id": z.string().min(1),
      "x-subscription-id": z.string().min(1),
      "x-user-groups": z.string(),
    }),
    path: z.object({
      fiscal_code: FiscalCodeSchema,
      id: z.string().min(1),
    }),
  },
  response: {
    200: GetServiceMessageResponseSchema,
    400: ProblemDetailsSchema,
    403: ProblemDetailsSchema,
    404: ProblemDetailsSchema,
    429: ProblemDetailsSchema,
    500: ProblemDetailsSchema,
  },
});

export const mountGetServiceMessageHandler = (
  server: FastifyInstance,
  useCase: GetServiceMessageUseCase,
): void => {
  mountFastifyRoute(server, {
    contract: getServiceMessageContract,
    inputMapper: (req) => ({
      fiscalCode: req.path.fiscal_code,
      groups: new Set(
        req.headers["x-user-groups"]
          .split(",")
          .map((group) => group.trim())
          .filter(Boolean),
      ),
      messageId: req.path.id,
      serviceId: req.headers["x-service-id"],
      subscriptionId: req.headers["x-subscription-id"],
    }),
    outputMapper: toGetServiceMessageResponse,
    useCase,
  });
};
