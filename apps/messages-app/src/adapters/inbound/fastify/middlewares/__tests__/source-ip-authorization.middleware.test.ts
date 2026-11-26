import { ForbiddenError } from "@pagopa/hexagonal-core";
import { describe, expect, it } from "vitest";

import { clientIpSchema } from "../../../../../domain/client-ip.js";
import { makeSourceIpAuthorizationMiddleware } from "../source-ip-authorization.middleware.js";

describe("makeSourceIpAuthorizationMiddleware", () => {
  it.each([
    { allowed: true, cidrs: ["192.0.2.0/24"], ip: "192.0.2.10" },
    { allowed: false, cidrs: ["192.0.2.0/24"], ip: "198.51.100.10" },
    { allowed: true, cidrs: ["192.0.2.10"], ip: "192.0.2.10" },
    { allowed: false, cidrs: ["192.0.2.10"], ip: "192.0.2.11" },
    {
      allowed: true,
      cidrs: ["198.51.100.0/24", "192.0.2.0/24"],
      ip: "192.0.2.10",
    },
    { allowed: true, cidrs: [], ip: "2001:db8::1" },
    { allowed: false, cidrs: ["192.0.2.0/24"], ip: "2001:db8::1" },
  ])(
    "checks $ip against $cidrs: allowed=$allowed",
    async ({ allowed, cidrs, ip }) => {
      const result = await makeSourceIpAuthorizationMiddleware()({
        context: {
          clientIp: clientIpSchema.parse(ip),
          service: { authorizedCidrs: cidrs, id: "service-id" },
        },
        payload: {},
      });

      expect(result.isOk()).toBe(allowed);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ForbiddenError);
      }
    },
  );
});
