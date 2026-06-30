import { FastifyInstance } from "fastify/types/instance.js";
import type { UseCase } from "@pagopa/hexagonal-core";
import { mountFastifyRoute } from "@pagopa/hexagonal-fastify";
import { defineRoute } from "@pagopa/hexagonal-core";
import { InfoOutputSchema } from "./dto/info.dto.js";

const infoContract = defineRoute({
  method: "get",
  operationId: "getInfo",
  path: "/api/info",
  request: {},
  response: {
    200: InfoOutputSchema,
  },
});

export const mountInfoHandler = (
  server: FastifyInstance,
  useCase: UseCase<
    Record<string, never>,
    // TODO: Import this from the use case directly.
    { name: string; version: string },
    never
  >,
): void => {
  mountFastifyRoute(server, {
    contract: infoContract,
    inputMapper: () => ({}),
    useCase,
  });
};
