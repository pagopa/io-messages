import type { FastifyInstance } from "fastify";

import { ProblemDetailsSchema, defineRoute } from "@pagopa/hexagonal-core";
import { mountFastifyRoute } from "@pagopa/hexagonal-fastify";

import { CreateRcConfigurationUseCase } from "../../../application/use-cases/create-rc-configuration.use-case.js";
import {
  RcConfigurationResponseSchema,
  toRcConfigurationResponse,
} from "./dto/get-rc-configuration.dto.js";
import { makeRcConfigurationAuthMiddleware } from "./middlewares/rc-configuration-auth.middleware.js";
import {
  CreateRcConfigurationRequestSchema,
  toRcConfigurationCreate,
} from "./dto/create-rc-configuration.dto.js";

const createRcConfigurationContract = defineRoute({
  method: "post",
  path: "/api/rc-configurations",
  request: {
    body: CreateRcConfigurationRequestSchema,
  },
  response: {
    201: RcConfigurationResponseSchema,
    400: ProblemDetailsSchema,
    403: ProblemDetailsSchema,
    409: ProblemDetailsSchema,
    429: ProblemDetailsSchema,
    500: ProblemDetailsSchema,
  },
});

export const mountCreateRcConfigurationHandler = (
  server: FastifyInstance,
  useCase: CreateRcConfigurationUseCase,
  internalUserId: string,
): void => {
  mountFastifyRoute(server, {
    contract: createRcConfigurationContract,
    inputMapper: (req, context) => ({
      configuration: toRcConfigurationCreate(req.body),
      userId: context.userId,
    }),
    middlewares: [makeRcConfigurationAuthMiddleware(internalUserId)],
    outputMapper: toRcConfigurationResponse,
    useCase,
  });
};
