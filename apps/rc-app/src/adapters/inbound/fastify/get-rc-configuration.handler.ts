import type { FastifyInstance } from "fastify";

import { ProblemDetailsSchema, defineRoute } from "@pagopa/hexagonal-core";
import { mountFastifyRoute } from "@pagopa/hexagonal-fastify";
import z from "zod";

import { GetRcConfiguratioUseCase } from "../../../application/use-cases/get-rc-configuration.use-case.js";
import {
  RcConfigurationResponseSchema,
  toRcConfigurationResponse,
} from "./dto/get-rc-configuration.dto.js";

const getRcConfigurationContract = defineRoute({
  method: "get",
  path: "/api/rc-configurations/{configurationId}",
  request: {
    headers: z.object({
      "X-Subscription-Id": z.string().min(1),
      "X-User-Groups": z.string().min(1),
      "X-User-Id": z.string().min(1),
    }),
    path: z.object({
      configurationId: z.string().min(1),
    }),
  },
  response: {
    200: RcConfigurationResponseSchema,
    400: ProblemDetailsSchema,
    404: ProblemDetailsSchema,
    429: ProblemDetailsSchema,
    500: ProblemDetailsSchema,
  },
});

export const mountGetRcConfigurationHandler = (
  server: FastifyInstance,
  useCase: GetRcConfiguratioUseCase,
): void => {
  mountFastifyRoute(server, {
    contract: getRcConfigurationContract,
    inputMapper: (req) => ({
      configurationId: req.path.configurationId,
    }),
    outputMapper: toRcConfigurationResponse,
    useCase,
  });
};
