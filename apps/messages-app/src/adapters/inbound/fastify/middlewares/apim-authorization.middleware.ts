import type {
  EmptyHttpMiddlewareContext,
  HttpRequestMiddleware,
} from "@pagopa/hexagonal-core";

import { ForbiddenError } from "@pagopa/hexagonal-core";
import { err, ok } from "neverthrow";
import z from "zod";

const apimHeadersSchema = z.object({
  "x-subscription-id": z.string().min(1),
  "x-user-groups": z.string().min(1),
  "x-user-id": z.string().min(1),
});

interface ApimAuthorizationInput {
  subscriptionId: string;
  userGroups: readonly string[];
  userId: string;
}

export const makeApimAuthorizationMiddleware =
  <AuthorizationContext extends object>(
    authorize: (
      input: ApimAuthorizationInput,
    ) => AuthorizationContext | undefined,
  ): HttpRequestMiddleware<
    EmptyHttpMiddlewareContext,
    AuthorizationContext,
    ForbiddenError
  > =>
  async ({ payload }) => {
    const parsedHeaders = apimHeadersSchema.safeParse(payload.headers);
    if (!parsedHeaders.success) {
      return err(new ForbiddenError());
    }

    const {
      "x-subscription-id": subscriptionId,
      "x-user-groups": userGroups,
      "x-user-id": userId,
    } = parsedHeaders.data;

    const authorizationContext = authorize({
      subscriptionId,
      userGroups: userGroups.split(","),
      userId,
    });

    if (!authorizationContext) {
      return err(new ForbiddenError());
    }

    return ok(authorizationContext);
  };
