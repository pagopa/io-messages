import type { FastifyInstance } from "fastify";

import {
  FiscalCodeSchema,
  ProblemDetailsSchema,
  defineRoute,
} from "@pagopa/hexagonal-core";
import { mountFastifyRoute } from "@pagopa/hexagonal-fastify";
import z from "zod";

import { ServicesCmsRepository } from "../../../application/ports/services-cms.js";
import { GetMessageForServiceUseCase } from "../../../application/use-cases/get-message-for-service.use-case.js";
import {
  GetMessageForServiceResponseSchema,
  toGetMessageForServiceResponse,
} from "./dto/get-message-for-service.dto.js";
import { makeClientIpMiddleware } from "./middlewares/client-ip.middleware.js";
import { makeGetMessageForServiceAuthorizationMiddleware } from "./middlewares/get-message-for-service-authorization.middleware.js";
import { makeServiceResolutionMiddleware } from "./middlewares/service-resolution.middleware.js";
import { makeSourceIpAuthorizationMiddleware } from "./middlewares/source-ip-authorization.middleware.js";
import { makeUserEmailMiddleware } from "./middlewares/user-email.middleware.js";

const getMessageForServiceContract = defineRoute({
  method: "get",
  path: "/api/services/messages/{fiscal_code}/{id}",
  request: {
    path: z.object({
      fiscal_code: FiscalCodeSchema,
      id: z.string().min(1),
    }),
  },
  response: {
    200: GetMessageForServiceResponseSchema,
    400: ProblemDetailsSchema,
    403: ProblemDetailsSchema,
    404: ProblemDetailsSchema,
    500: ProblemDetailsSchema,
  },
});

export const mountGetMessageForServiceHandler = (
  server: FastifyInstance,
  useCase: GetMessageForServiceUseCase,
  servicesCmsRepository: ServicesCmsRepository,
): void => {
  mountFastifyRoute(server, {
    contract: getMessageForServiceContract,
    inputMapper: (req, context) => ({
      fiscalCode: req.path.fiscal_code,
      groups: context.groups,
      messageId: req.path.id,
      serviceId: context.service.id,
      subscriptionId: context.subscriptionId,
    }),
    middlewares: [
      makeGetMessageForServiceAuthorizationMiddleware(),
      makeClientIpMiddleware(),
      makeUserEmailMiddleware(),
      makeServiceResolutionMiddleware(servicesCmsRepository),
      makeSourceIpAuthorizationMiddleware(),
    ],
    outputMapper: toGetMessageForServiceResponse,
    useCase,
  });
};
