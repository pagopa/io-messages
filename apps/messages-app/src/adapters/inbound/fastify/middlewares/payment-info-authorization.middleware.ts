import type {
  EmptyHttpMiddlewareContext,
  HttpRequestMiddleware,
} from "@pagopa/hexagonal-core";

import { ForbiddenError } from "@pagopa/hexagonal-core";
import { err, ok } from "neverthrow";
import z from "zod";

const paymentInfoPermission = "ApiPaymentInfoRead";

const apimHeadersSchema = z.object({
  "x-subscription-id": z.string().min(1),
  "x-user-groups": z.string().min(1),
  "x-user-id": z.string().min(1),
});

export interface PaymentInfoAuthorizationContext {
  subscriptionId: string;
  userId: string;
}

export const makePaymentInfoAuthorizationMiddleware =
  (): HttpRequestMiddleware<
    EmptyHttpMiddlewareContext,
    PaymentInfoAuthorizationContext,
    ForbiddenError
  > =>
  async ({ payload }) => {
    const parsedHeaders = apimHeadersSchema.safeParse(payload.headers);
    if (!parsedHeaders.success) return err(new ForbiddenError());

    const {
      "x-subscription-id": subscriptionId,
      "x-user-groups": userGroups,
      "x-user-id": userId,
    } = parsedHeaders.data;

    if (!userGroups.split(",").includes(paymentInfoPermission)) {
      return err(new ForbiddenError());
    }

    return ok({ subscriptionId, userId });
  };
