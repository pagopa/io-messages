import type { FastifyInstance } from "fastify";

import { ProblemDetailsSchema, defineRoute } from "@pagopa/hexagonal-core";
import { mountFastifyRoute } from "@pagopa/hexagonal-fastify";
import { fiscalCodeSchema } from "io-messages-common/domain/fiscal-code";
import z from "zod";

import type { CreateMessageUseCase } from "../../../application/use-cases/create-message.use-case.js";

import {
  createdMessageSchema,
  newMessageSchema,
} from "../../../application/ports/create-message.js";
import { makeClientIpMiddleware } from "./middlewares/client-ip.middleware.js";
import { makeCreateMessageAuthorizationMiddleware } from "./middlewares/create-message-authorization.middleware.js";
import { makeUserEmailMiddleware } from "./middlewares/user-email.middleware.js";

const createMessagePathSchema = z.object({
  fiscal_code: fiscalCodeSchema,
});

const optionalCreateMessagePathSchema = z.object({
  fiscal_code: fiscalCodeSchema.optional(),
});

const createMessageFastifyPaths = new Set([
  "/api/v1/messages",
  "/api/v1/messages/:fiscal_code",
]);

const createMessageResponse = {
  201: {
    description: "Message created",
    schema: createdMessageSchema,
  },
  400: ProblemDetailsSchema,
  403: ProblemDetailsSchema,
  404: ProblemDetailsSchema,
  429: ProblemDetailsSchema,
  500: ProblemDetailsSchema,
};

const createMessageWithFiscalCodeInBodyContract = defineRoute({
  method: "post",
  path: "/api/v1/messages",
  request: {
    body: newMessageSchema,
  },
  response: createMessageResponse,
});

const createMessageWithFiscalCodeInPathContract = defineRoute({
  method: "post",
  path: "/api/v1/messages/{fiscal_code}",
  request: {
    body: newMessageSchema,
    path: createMessagePathSchema,
  },
  response: createMessageResponse,
});

const addLocationHeader = (server: FastifyInstance): void => {
  server.addHook("preSerialization", async (request, reply, payload) => {
    const routePath = request.routeOptions.url;

    if (
      request.method !== "POST" ||
      reply.statusCode !== 201 ||
      !routePath ||
      !createMessageFastifyPaths.has(routePath)
    ) {
      return payload;
    }

    const output = createdMessageSchema.parse(payload);
    const message = newMessageSchema.parse(request.body);
    const path = optionalCreateMessagePathSchema.parse(request.params);
    const fiscalCode = path.fiscal_code ?? message.fiscal_code;

    if (!fiscalCode) {
      throw new Error(
        "Cannot create the Location header without a recipient fiscal code",
      );
    }

    reply.header("Location", `/api/v1/messages/${fiscalCode}/${output.id}`);
    return payload;
  });
};

export const mountCreateMessageHandler = (
  server: FastifyInstance,
  useCase: CreateMessageUseCase,
): void => {
  addLocationHeader(server);

  mountFastifyRoute(server, {
    contract: createMessageWithFiscalCodeInBodyContract,
    inputMapper: (request, context) => ({
      clientIp: context.clientIp,
      message: request.body,
      permissions: context.permissions,
      subscriptionId: context.subscriptionId,
      userEmail: context.userEmail,
      userId: context.userId,
    }),
    middlewares: [
      makeCreateMessageAuthorizationMiddleware(),
      makeClientIpMiddleware(),
      makeUserEmailMiddleware(),
    ],
    useCase,
  });

  mountFastifyRoute(server, {
    contract: createMessageWithFiscalCodeInPathContract,
    inputMapper: (request, context) => ({
      clientIp: context.clientIp,
      fiscalCode: request.path.fiscal_code,
      message: request.body,
      permissions: context.permissions,
      subscriptionId: context.subscriptionId,
      userEmail: context.userEmail,
      userId: context.userId,
    }),
    middlewares: [
      makeCreateMessageAuthorizationMiddleware(),
      makeClientIpMiddleware(),
      makeUserEmailMiddleware(),
    ],
    useCase,
  });
};
