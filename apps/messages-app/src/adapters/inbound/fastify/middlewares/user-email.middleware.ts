import type {
  EmailAddress,
  EmptyHttpMiddlewareContext,
  HttpRequestMiddleware,
} from "@pagopa/hexagonal-core";

import { EmailAddressSchema, GenericError } from "@pagopa/hexagonal-core";
import { err, ok } from "neverthrow";
import z from "zod";

const headersSchema = z.object({
  "x-user-email": EmailAddressSchema,
});

export interface UserEmailContext {
  userEmail: EmailAddress;
}

/**
 * Extracts and validates the user email provided by APIM.
 *
 * Missing, empty, or invalid values produce `GenericError` to preserve the
 * legacy endpoint behavior.
 */
export const makeUserEmailMiddleware =
  (): HttpRequestMiddleware<
    EmptyHttpMiddlewareContext,
    UserEmailContext,
    GenericError
  > =>
  async ({ payload }) => {
    const parsedHeaders = headersSchema.safeParse(payload.headers);
    if (!parsedHeaders.success) {
      return err(
        new GenericError("Missing, empty or invalid x-user-email header"),
      );
    }

    return ok({ userEmail: parsedHeaders.data["x-user-email"] });
  };
