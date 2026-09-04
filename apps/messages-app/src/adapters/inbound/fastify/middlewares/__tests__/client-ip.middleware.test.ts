import { GenericError } from "@pagopa/hexagonal-core";
import { describe, expect, it } from "vitest";

import { makeClientIpMiddleware } from "../client-ip.middleware.js";

const executeMiddleware = (headers: unknown) =>
  makeClientIpMiddleware()({
    context: {},
    payload: { headers },
  });

describe("makeClientIpMiddleware", () => {
  it("extracts an IPv4 address", async () => {
    const result = await executeMiddleware({
      "x-forwarded-for": "192.0.2.1",
    });

    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap()).toEqual({ clientIp: "192.0.2.1" });
  });

  it("extracts an IPv4 address without its port", async () => {
    const result = await executeMiddleware({
      "x-forwarded-for": "192.0.2.1:443",
    });

    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap()).toEqual({ clientIp: "192.0.2.1" });
  });

  it("extracts an IPv6 address", async () => {
    const result = await executeMiddleware({
      "x-forwarded-for": "2001:db8::1",
    });

    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap()).toEqual({ clientIp: "2001:db8::1" });
  });

  it("returns the first valid IP from the forwarded chain", async () => {
    const result = await executeMiddleware({
      "x-forwarded-for": "invalid, 192.0.2.1, 198.51.100.2",
    });

    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap()).toEqual({ clientIp: "192.0.2.1" });
  });

  it.each([
    ["headers are missing", undefined],
    ["the forwarded header is missing", {}],
    ["the forwarded header is empty", { "x-forwarded-for": "" }],
    ["the forwarded header is not a string", { "x-forwarded-for": [] }],
    [
      "the forwarded chain contains no valid IP",
      { "x-forwarded-for": "invalid, also-invalid" },
    ],
  ])("returns GenericError when %s", async (_, headers) => {
    const result = await executeMiddleware(headers);

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(GenericError);
    expect(result._unsafeUnwrapErr().message).toContain(
      "IP address cannot be extracted from the request",
    );
  });
});
