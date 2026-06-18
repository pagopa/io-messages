import type { FastifyInstance } from "fastify";

import fastify from "fastify";
import { mountInfoHandler } from "./adapters/inbound/fastify/info.handler.js";
import { getInfoUseCase } from "./application/use-cases/info.use-case.js";

export const createApp = (): {
  server: FastifyInstance;
} => {
  const server = fastify();

  mountInfoHandler(server, getInfoUseCase);

  return { server };
};
