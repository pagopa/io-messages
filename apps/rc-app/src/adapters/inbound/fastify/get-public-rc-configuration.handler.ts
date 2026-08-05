import type { FastifyInstance } from "fastify";

import { ProblemDetailsSchema, defineRoute } from "@pagopa/hexagonal-core";
import { mountFastifyRoute } from "@pagopa/hexagonal-fastify";
import z from "zod";

import { RcConfigurationIdSchema } from "../../../application/ports/rc-configuration.js";
import { GetPublicRcConfigurationUseCase } from "../../../application/use-cases/get-public-rc-configuration.use-case.js";
import {
  RcConfigurationPublicResponseSchema,
  toRcConfigurationPublicResponse,
} from "./dto/get-public-rc-configuration.dto.js";
import { makeRcConfigurationAuthMiddleware } from "./middlewares/rc-configuration-auth.middleware.js";

const getPublicRcConfigurationContract = defineRoute({
  method: "get",
  path: "/api/rc-configurations/{configurationId}",
  request: {
    path: z.object({
      configurationId: RcConfigurationIdSchema,
    }),
  },
  response: {
    200: RcConfigurationPublicResponseSchema,
    400: ProblemDetailsSchema,
    403: ProblemDetailsSchema,
    404: ProblemDetailsSchema,
    500: ProblemDetailsSchema,
  },
});

export const mountGetPublicRcConfigurationHandler = (
  server: FastifyInstance,
  useCase: GetPublicRcConfigurationUseCase,
  internalUserId: string,
): void => {
  mountFastifyRoute(server, {
    contract: getPublicRcConfigurationContract,
    inputMapper: (req, context) => ({
      configurationId: req.path.configurationId,
      isInternalUser: context.isInternalUser,
      userId: context.userId,
    }),
    middlewares: [makeRcConfigurationAuthMiddleware(internalUserId)],
    outputMapper: toRcConfigurationPublicResponse,
    useCase,
  });
};
