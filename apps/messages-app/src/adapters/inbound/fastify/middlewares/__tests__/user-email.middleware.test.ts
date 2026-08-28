import { GenericError } from "@pagopa/hexagonal-core";
import { describe, expect, it } from "vitest";

import { makeUserEmailMiddleware } from "../user-email.middleware.js";

const executeMiddleware = (headers: unknown) =>
  makeUserEmailMiddleware()({
    context: {},
    payload: { headers },
  });

describe("makeUserEmailMiddleware", () => {
  it("extracts a valid user email", async () => {
    const result = await executeMiddleware({
      "x-user-email": "user@example.com",
    });

    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap()).toEqual({
      userEmail: "user@example.com",
    });
  });

  it.each([
    ["headers are missing", undefined],
    ["the user email header is missing", {}],
    ["the user email is empty", { "x-user-email": "" }],
    ["the user email is invalid", { "x-user-email": "invalid-email" }],
    ["the user email is not a string", { "x-user-email": [] }],
  ])("returns GenericError when %s", async (_, headers) => {
    const result = await executeMiddleware(headers);

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(GenericError);
    expect(result._unsafeUnwrapErr().message).toContain(
      "Missing, empty or invalid x-user-email header",
    );
  });
});
