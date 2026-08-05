import type {
  EmptyHttpMiddlewareContext,
  HttpRequestMiddleware,
} from "@pagopa/hexagonal-core";

import { ForbiddenError } from "@pagopa/hexagonal-core";
import { err, ok } from "neverthrow";
import z from "zod";

const MANAGE_SUBSCRIPTION_PREFIX = "MANAGE-";
const ALLOWED_RC_CONFIG_API_GROUP = "ApiRemoteContentConfigurationWrite";

// APIM may send its full user resource path; only its final segment identifies
// the user stored in an RC configuration.
const apimUserIdSchema = z
  .string()
  .min(1)
  .transform((userId) => userId.split("/").at(-1))
  .pipe(z.string().min(1));

const apimHeadersSchema = z.object({
  "x-subscription-id": z.string().min(1),
  "x-user-groups": z.string().min(1),
  "x-user-id": apimUserIdSchema,
});

export interface RcConfigurationAuthContext {
  isInternalUser: boolean;
  userId: string;
}

/**
 * Authenticates and pre-authorizes requests forwarded by APIM.
 *
 * Missing, malformed, or unauthorized APIM headers produce `ForbiddenError` to
 * preserve the legacy endpoint behavior.
 */
export const makeRcConfigurationAuthMiddleware =
  (
    internalUserId: string,
  ): HttpRequestMiddleware<
    EmptyHttpMiddlewareContext,
    RcConfigurationAuthContext,
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

    const isInternalUser = userId === internalUserId;

    // Regular users require both a management subscription and membership in
    // the write group.
    const canManageConfigurations =
      subscriptionId.startsWith(MANAGE_SUBSCRIPTION_PREFIX) &&
      userGroups.includes(ALLOWED_RC_CONFIG_API_GROUP);

    if (!isInternalUser && !canManageConfigurations) {
      return err(new ForbiddenError());
    }

    return ok({ isInternalUser, userId });
  };
