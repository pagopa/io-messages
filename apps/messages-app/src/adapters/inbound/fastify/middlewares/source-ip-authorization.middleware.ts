import type {
  EmptyHttpMiddlewareContext,
  HttpRequestMiddleware,
} from "@pagopa/hexagonal-core";

import { ForbiddenError } from "@pagopa/hexagonal-core";
import { err, ok } from "neverthrow";

import type { ClientIpContext } from "./client-ip.middleware.js";
import type { ServiceContext } from "./service-resolution.middleware.js";

import { isClientIpAuthorized } from "../../../../domain/client-ip.js";

export const makeSourceIpAuthorizationMiddleware =
  (): HttpRequestMiddleware<
    ClientIpContext & ServiceContext,
    EmptyHttpMiddlewareContext,
    ForbiddenError
  > =>
  async ({ context }) =>
    isClientIpAuthorized(context.clientIp, context.service.authorizedCidrs)
      ? ok({})
      : err(new ForbiddenError());
