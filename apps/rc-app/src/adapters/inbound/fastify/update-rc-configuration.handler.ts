import type { FastifyInstance } from "fastify";

import { ProblemDetailsSchema, defineRoute } from "@pagopa/hexagonal-core";
import { mountFastifyRoute } from "@pagopa/hexagonal-fastify";
import { RcConfigurationIdSchema } from "io-messages-common/domain/remote-content";
import z from "zod";

import { UpdateRcConfigurationUseCase } from "../../../application/use-cases/update-rc-configuration.use-case.js";
import {
  UpdateRcConfigurationRequestSchema,
  toRcConfigurationUpdate,
} from "./dto/update-rc-configuration.dto.js";
import { makeRcConfigurationAuthMiddleware } from "./middlewares/rc-configuration-auth.middleware.js";

const updateRcConfigurationContract = defineRoute({
  method: "put",
  path: "/api/rc-configurations/{configurationId}",
  request: {
    body: UpdateRcConfigurationRequestSchema,
    path: z.object({
      configurationId: RcConfigurationIdSchema,
    }),
  },
  response: {
    204: z.undefined(),
    400: ProblemDetailsSchema,
    403: ProblemDetailsSchema,
    404: ProblemDetailsSchema,
    429: ProblemDetailsSchema,
    500: ProblemDetailsSchema,
  },
});

export const mountUpdateRcConfigurationHandler = (
  server: FastifyInstance,
  useCase: UpdateRcConfigurationUseCase,
  internalUserId: string,
): void => {
  mountFastifyRoute(server, {
    contract: updateRcConfigurationContract,
    inputMapper: (req, context) => ({
      configuration: toRcConfigurationUpdate(req.body),
      configurationId: req.path.configurationId,
      isInternalUser: context.isInternalUser,
      userId: context.userId,
    }),
    middlewares: [makeRcConfigurationAuthMiddleware(internalUserId)],
    outputMapper: () => undefined,
    useCase,
  });
};
