import {
  EmptyHttpMiddlewareContext,
  FiscalCodeSchema,
  HttpRequestMiddleware,
  ValidationError,
} from "@pagopa/hexagonal-core";
import { spidLevelSchema } from "io-messages-common/adapters/auth/spid-level";
import { assertionRefSchema } from "io-messages-common/adapters/lollipop/definitions/assertion-ref";
import { Result, err, ok } from "neverthrow";
import { z } from "zod";

// headersSchema represent the header object expected from the `x-user` middleware.
const headersSchema = z.object({
  "x-user": z.base64().min(1),
});

export const userIdentitySchema = z.object({
  assertion_ref: assertionRefSchema.optional(),
  date_of_birth: z.string(),
  family_name: z.string(),
  fiscal_code: FiscalCodeSchema,
  name: z.string(),
  session_tracking_id: z.string().optional(),
  spid_email: z.email().optional(),
  spid_idp: z.string().optional(),
  spid_level: spidLevelSchema,
});
export type UserIdentity = z.infer<typeof userIdentitySchema>;

export const makeXUserMiddleware =
  (): HttpRequestMiddleware<
    EmptyHttpMiddlewareContext,
    UserIdentity,
    ValidationError
  > =>
  async ({ payload }) => {
    const decodedHeaders = Result.fromThrowable(
      () => headersSchema.parse(payload.headers),
      () => new ValidationError("Invalid x-user header"),
    )();
    if (decodedHeaders.isErr()) {
      return err(decodedHeaders.error);
    }

    const userIdentityHeader = Buffer.from(
      decodedHeaders.value["x-user"],
      "base64",
    ).toString("utf8");

    const userIdentity = Result.fromThrowable(
      () => userIdentitySchema.parse(JSON.parse(userIdentityHeader)),
      () => new ValidationError("Invalid UserIdentity in x-user header"),
    )();
    if (userIdentity.isErr()) {
      return err(userIdentity.error);
    }

    return ok(userIdentity.value);
  };
