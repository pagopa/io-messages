import { ForbiddenError } from "@pagopa/hexagonal-core";
import { describe, expect, it } from "vitest";

import { makeCreateMessageAuthorizationMiddleware } from "../create-message-authorization.middleware.js";

const validHeaders = {
  "x-subscription-id": "subscription-id",
  "x-user-groups": "ApiMessageWrite",
  "x-user-id": "user-id",
};

const executeMiddleware = (headers: unknown) =>
  makeCreateMessageAuthorizationMiddleware()({
    context: {},
    payload: { headers },
  });

describe("makeCreateMessageAuthorizationMiddleware", () => {
  it("authorizes a user with ApiMessageWrite", async () => {
    const result = await executeMiddleware(validHeaders);

    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap()).toEqual({
      permissions: new Set(["ApiMessageWrite"]),
      subscriptionId: "subscription-id",
      userId: "user-id",
    });
  });

  it("authorizes a user with ApiLimitedMessageWrite", async () => {
    const result = await executeMiddleware({
      ...validHeaders,
      "x-user-groups": "ApiLimitedMessageWrite",
    });

    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap().permissions).toEqual(
      new Set(["ApiLimitedMessageWrite"]),
    );
  });

  it("keeps recognized payload-specific permissions", async () => {
    const result = await executeMiddleware({
      ...validHeaders,
      "x-user-groups": [
        "ApiMessageWrite",
        "ApiMessageWriteAdvanced",
        "ApiMessageWriteEUCovidCert",
        "ApiMessageWriteWithPayee",
        "ApiThirdPartyMessageWrite",
      ].join(","),
    });

    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap().permissions).toEqual(
      new Set([
        "ApiMessageWrite",
        "ApiMessageWriteAdvanced",
        "ApiMessageWriteEUCovidCert",
        "ApiMessageWriteWithPayee",
        "ApiThirdPartyMessageWrite",
      ]),
    );
  });

  it("ignores unknown groups when a base permission is present", async () => {
    const result = await executeMiddleware({
      ...validHeaders,
      "x-user-groups": "UnknownGroup,ApiMessageWrite",
    });

    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap().permissions).toEqual(
      new Set(["ApiMessageWrite"]),
    );
  });

  it.each([
    ["headers are missing", undefined],
    [
      "the user id is missing",
      {
        "x-subscription-id": validHeaders["x-subscription-id"],
        "x-user-groups": validHeaders["x-user-groups"],
      },
    ],
    [
      "the subscription id is missing",
      {
        "x-user-groups": validHeaders["x-user-groups"],
        "x-user-id": validHeaders["x-user-id"],
      },
    ],
    [
      "the groups header is missing",
      {
        "x-subscription-id": validHeaders["x-subscription-id"],
        "x-user-id": validHeaders["x-user-id"],
      },
    ],
    [
      "the user id is empty",
      {
        ...validHeaders,
        "x-user-id": "",
      },
    ],
    [
      "the subscription id is empty",
      {
        ...validHeaders,
        "x-subscription-id": "",
      },
    ],
    [
      "the groups header is empty",
      {
        ...validHeaders,
        "x-user-groups": "",
      },
    ],
    [
      "the groups header contains only unknown groups",
      {
        ...validHeaders,
        "x-user-groups": "UnknownGroup",
      },
    ],
    [
      "only a payload-specific permission is present",
      {
        ...validHeaders,
        "x-user-groups": "ApiThirdPartyMessageWrite",
      },
    ],
  ])("returns ForbiddenError when %s", async (_, headers) => {
    const result = await executeMiddleware(headers);

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(ForbiddenError);
  });
});
