import { ForbiddenError } from "@pagopa/hexagonal-core";
import { describe, expect, it } from "vitest";

import { makeRcConfigurationAuthMiddleware } from "../rc-configuration-auth.middleware.js";

const internalUserId = "internal-user";

const validHeaders = {
  "x-subscription-id": "MANAGE-subscription-id",
  "x-user-groups": "ApiRemoteContentConfigurationWrite",
  "x-user-id": "user-123",
};

const executeMiddleware = (
  headers: unknown,
  configuredInternalUserId = internalUserId,
) =>
  makeRcConfigurationAuthMiddleware(configuredInternalUserId)({
    context: {},
    payload: { headers },
  });

describe("makeRcConfigurationAuthMiddleware", () => {
  it("authorizes a user with a management subscription and the write group", async () => {
    const result = await executeMiddleware(validHeaders);

    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap()).toEqual({
      isInternalUser: false,
      userId: "user-123",
    });
  });

  it("extracts the user id from the APIM user resource path", async () => {
    const result = await executeMiddleware({
      ...validHeaders,
      "x-user-id": "/subscriptions/subscription-id/users/user-123",
    });

    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap()).toEqual({
      isInternalUser: false,
      userId: "user-123",
    });
  });

  it("authorizes the internal user without management permissions", async () => {
    const result = await executeMiddleware({
      "x-subscription-id": "subscription-id",
      "x-user-groups": "another-group",
      "x-user-id": `/subscriptions/subscription-id/users/${internalUserId}`,
    });

    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap()).toEqual({
      isInternalUser: true,
      userId: internalUserId,
    });
  });

  it.each([
    ["headers are missing", undefined],
    [
      "the subscription id is missing",
      {
        "x-user-groups": validHeaders["x-user-groups"],
        "x-user-id": validHeaders["x-user-id"],
      },
    ],
    [
      "the user groups are empty",
      {
        ...validHeaders,
        "x-user-groups": "",
      },
    ],
    [
      "the APIM user resource path has no user id",
      {
        ...validHeaders,
        "x-user-id": "/subscriptions/subscription-id/users/",
      },
    ],
  ])("returns ForbiddenError when %s", async (_, headers) => {
    const result = await executeMiddleware(headers);

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(ForbiddenError);
  });

  it.each([
    [
      "the subscription is not a management subscription",
      {
        ...validHeaders,
        "x-subscription-id": "READ-subscription-id",
      },
    ],
    [
      "the user does not belong to the write group",
      {
        ...validHeaders,
        "x-user-groups": "another-group",
      },
    ],
  ])("returns ForbiddenError when %s", async (_, headers) => {
    const result = await executeMiddleware(headers);

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(ForbiddenError);
  });
});
