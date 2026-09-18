import { FiscalCodeSchema, ValidationError } from "@pagopa/hexagonal-core";
import { describe, expect, it } from "vitest";

import type { UserIdentity } from "../x-user.middleware.js";

import { makeXUserMiddleware } from "../x-user.middleware.js";

const validUserIdentity: UserIdentity = {
  assertion_ref: `sha256-${"A".repeat(44)}`,
  date_of_birth: "1980-01-01",
  family_name: "Rossi",
  fiscal_code: FiscalCodeSchema.parse("RSSMRA80A01H501U"),
  name: "Mario",
  session_tracking_id: "session-tracking-id",
  spid_email: "mario.rossi@example.com",
  spid_idp: "https://idp.example.com",
  spid_level: "https://www.spid.gov.it/SpidL2",
};

const toBase64 = (value: unknown): string =>
  Buffer.from(JSON.stringify(value)).toString("base64");

const executeMiddleware = (headers: unknown) =>
  makeXUserMiddleware()({
    context: {},
    payload: { headers },
  });

describe("makeXUserMiddleware", () => {
  it("extracts a valid user identity", async () => {
    const result = await executeMiddleware({
      "x-user": toBase64(validUserIdentity),
    });

    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap()).toEqual(validUserIdentity);
  });

  it.each([
    ["headers are missing", undefined],
    ["the x-user header is missing", {}],
    ["the x-user header is empty", { "x-user": "" }],
    ["the x-user header is not a string", { "x-user": [] }],
    ["the x-user header is not Base64", { "x-user": "not-valid-base64!@#" }],
  ])("returns ValidationError when %s", async (_, headers) => {
    const result = await executeMiddleware(headers);

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(ValidationError);
    expect(result._unsafeUnwrapErr().message).toContain(
      "Invalid x-user header",
    );
  });

  it.each([
    [
      "the decoded header is not JSON",
      Buffer.from("not valid json").toString("base64"),
    ],
    ["the user identity is empty", toBase64({})],
    [
      "the fiscal code is invalid",
      toBase64({ ...validUserIdentity, fiscal_code: "INVALID" }),
    ],
  ])("returns ValidationError when %s", async (_, userHeader) => {
    const result = await executeMiddleware({ "x-user": userHeader });

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(ValidationError);
    expect(result._unsafeUnwrapErr().message).toContain(
      "Invalid UserIdentity in x-user header",
    );
  });
});
