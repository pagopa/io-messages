import type {
  EmptyHttpMiddlewareContext,
  HttpRequestMiddleware,
} from "@pagopa/hexagonal-core";

import { ForbiddenError } from "@pagopa/hexagonal-core";
import { err, ok } from "neverthrow";
import z from "zod";

import type { CreateMessagePermission } from "../../../../application/ports/create-message.js";

import { createMessagePermissionSchema } from "../../../../application/ports/create-message.js";

const apimHeadersSchema = z.object({
  "x-subscription-id": z.string().min(1),
  "x-user-groups": z.string().min(1),
  "x-user-id": z.string().min(1),
});

export interface CreateMessageAuthorizationContext {
  permissions: ReadonlySet<CreateMessagePermission>;
  subscriptionId: string;
  userId: string;
}

/**
 * Authenticates and pre-authorizes create-message requests forwarded by APIM.
 *
 * Payload-specific permissions are intentionally enforced by the use case,
 * after request validation.
 *
 * Missing, malformed, or unauthorized APIM headers produce `ForbiddenError` to
 * preserve the legacy endpoint behavior.
 */
export const makeCreateMessageAuthorizationMiddleware =
  (): HttpRequestMiddleware<
    EmptyHttpMiddlewareContext,
    CreateMessageAuthorizationContext,
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

    const permissions = new Set(
      userGroups
        .split(",")
        .filter(
          (permission): permission is CreateMessagePermission =>
            createMessagePermissionSchema.safeParse(permission).success,
        ),
    );

    const canSendMessages =
      permissions.has("ApiMessageWrite") ||
      permissions.has("ApiLimitedMessageWrite");

    if (!canSendMessages) {
      return err(new ForbiddenError());
    }

    return ok({ permissions, subscriptionId, userId });
  };
