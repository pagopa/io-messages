import { FastifyInstance } from "fastify/types/instance.js";
import type { UseCase } from "@pagopa/io-core-domain";
import { mountFastifyRoute } from "@pagopa/io-core-adapter-fastify";
import { defineRoute } from "@pagopa/io-core-domain";
import { InfoOutputSchema } from "./dto/info.dto.js";

const infoContract = defineRoute({
  method: "get",
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
    transformInput: () => ({}),
    useCase,
  });
};
