import { ForbiddenError } from "@pagopa/hexagonal-core";
import { describe, expect, it } from "vitest";

import { makeGetMessageForServiceAuthorizationMiddleware } from "../get-message-for-service-authorization.middleware.js";

const validHeaders = {
  "x-subscription-id": "subscription-id",
  "x-user-groups": "ApiMessageRead",
  "x-user-id": "user-id",
};

const executeMiddleware = (headers: unknown) =>
  makeGetMessageForServiceAuthorizationMiddleware()({
    context: {},
    payload: { headers },
  });

describe("makeGetMessageForServiceAuthorizationMiddleware", () => {
  it("authorizes the base permission and exposes the caller context", async () => {
    const result = await executeMiddleware(validHeaders);

    expect(result._unsafeUnwrap()).toEqual({
      groups: new Set(["ApiMessageRead"]),
      subscriptionId: "subscription-id",
    });
  });

  it("preserves the advanced permission when the base permission is present", async () => {
    const result = await executeMiddleware({
      ...validHeaders,
      "x-user-groups": "ApiMessageReadAdvanced,ApiMessageRead",
    });

    expect(result._unsafeUnwrap().groups).toEqual(
      new Set(["ApiMessageReadAdvanced", "ApiMessageRead"]),
    );
  });

  it.each([
    "ApiMessageWrite",
    "ApiMessageReadAdvanced",
    "UnknownGroup",
    "PrefixApiMessageReadSuffix",
    " ApiMessageRead",
  ])("rejects groups without the exact base permission: %s", async (groups) => {
    const result = await executeMiddleware({
      ...validHeaders,
      "x-user-groups": groups,
    });

    expect(result._unsafeUnwrapErr()).toBeInstanceOf(ForbiddenError);
  });

  it("rejects missing headers", async () => {
    const result = await executeMiddleware(undefined);

    expect(result._unsafeUnwrapErr()).toBeInstanceOf(ForbiddenError);
  });

  it.each([
    ["x-user-id", undefined],
    ["x-user-id", ""],
    ["x-subscription-id", undefined],
    ["x-subscription-id", ""],
    ["x-user-groups", undefined],
    ["x-user-groups", ""],
    ["x-user-groups", ["ApiMessageRead"]],
  ])("rejects a missing or malformed %s header: %j", async (header, value) => {
    const result = await executeMiddleware({
      ...validHeaders,
      [header]: value,
    });

    expect(result._unsafeUnwrapErr()).toBeInstanceOf(ForbiddenError);
  });
});
