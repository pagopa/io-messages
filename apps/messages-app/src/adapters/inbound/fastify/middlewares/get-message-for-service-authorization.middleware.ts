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

export interface GetMessageForServiceAuthorizationContext {
  groups: ReadonlySet<string>;
  subscriptionId: string;
}

export const makeGetMessageForServiceAuthorizationMiddleware =
  (): HttpRequestMiddleware<
    EmptyHttpMiddlewareContext,
    GetMessageForServiceAuthorizationContext,
    ForbiddenError
  > =>
  async ({ payload }) => {
    const parsedHeaders = apimHeadersSchema.safeParse(payload.headers);
    if (!parsedHeaders.success) {
      return err(new ForbiddenError());
    }

    const { "x-subscription-id": subscriptionId, "x-user-groups": userGroups } =
      parsedHeaders.data;
    const groups = new Set(userGroups.split(",").filter(Boolean));
    if (!groups.has("ApiMessageRead")) {
      return err(new ForbiddenError());
    }

    return ok({ groups, subscriptionId });
  };
