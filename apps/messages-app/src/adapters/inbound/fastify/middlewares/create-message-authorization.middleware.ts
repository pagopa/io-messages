import type { CreateMessagePermission } from "../../../../application/ports/create-message.js";

import { createMessagePermissionSchema } from "../../../../application/ports/create-message.js";
import { makeApimAuthorizationMiddleware } from "./apim-authorization.middleware.js";

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
export const makeCreateMessageAuthorizationMiddleware = () =>
  makeApimAuthorizationMiddleware<CreateMessageAuthorizationContext>(
    ({ subscriptionId, userGroups, userId }) => {
      const permissions = new Set(
        userGroups.filter(
          (permission): permission is CreateMessagePermission =>
            createMessagePermissionSchema.safeParse(permission).success,
        ),
      );

      const canSendMessages =
        permissions.has("ApiMessageWrite") ||
        permissions.has("ApiLimitedMessageWrite");

      return canSendMessages
        ? { permissions, subscriptionId, userId }
        : undefined;
    },
  );
