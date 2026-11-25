import type { FastifyInstance } from "fastify";

import { ProblemDetailsSchema, defineRoute } from "@pagopa/hexagonal-core";
import { mountFastifyRoute } from "@pagopa/hexagonal-fastify";
import z from "zod";

import { ListRcConfigurationUseCase } from "../../../application/use-cases/list-rc-confguration.use-case.js";
import {
  RcConfigurationResponseSchema,
  toRcConfigurationResponse,
} from "./dto/get-rc-configuration.dto.js";
import { makeRcConfigurationAuthMiddleware } from "./middlewares/rc-configuration-auth.middleware.js";

const listRcConfigurationResponseSchema = z.object({
  rcConfigList: z.array(RcConfigurationResponseSchema),
});

const listRcConfigurationContract = defineRoute({
  method: "get",
  path: "/api/rc-configurations",
  request: {},
  response: {
    200: listRcConfigurationResponseSchema,
    400: ProblemDetailsSchema,
    403: ProblemDetailsSchema,
    429: ProblemDetailsSchema,
    500: ProblemDetailsSchema,
  },
});

export const mountListRcConfigurationHandler = (
  server: FastifyInstance,
  useCase: ListRcConfigurationUseCase,
  internalUserId: string,
): void => {
  mountFastifyRoute(server, {
    contract: listRcConfigurationContract,
    inputMapper: (_, context) => ({
      userId: context.userId,
    }),
    middlewares: [makeRcConfigurationAuthMiddleware(internalUserId)],
    outputMapper: (configurations) => ({
      rcConfigList: configurations.map(toRcConfigurationResponse),
    }),
    useCase,
  });
};
