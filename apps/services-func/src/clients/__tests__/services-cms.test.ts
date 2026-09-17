import { FiscalCode, NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import * as E from "fp-ts/lib/Either";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { makeServicesCmsClient } from "../services-cms";

const serviceId = "01ARZ3NDEKTSV4RRFFQ69G5FAV" as NonEmptyString;
const responseBody = {
  authorized_cidrs: ["192.0.2.0/24"],
  authorized_recipients: ["AAABBB00A00A000A"],
  id: serviceId,
  max_allowed_payment_amount: 1000,
  metadata: { category: "SPECIAL" },
  name: "A service",
  organization: {
    fiscal_code: "01234567890",
    name: "An organization",
  },
  require_secure_channel: true,
};

const fetchApi = vi.fn<typeof fetch>();
const client = makeServicesCmsClient(
  "https://apim.example/base",
  "subscription-key",
  fetchApi,
);

describe("ServicesCmsClient", () => {
  beforeEach(() => {
    fetchApi.mockReset();
  });

  it("maps a valid service response to the minimal domain model", async () => {
    fetchApi.mockResolvedValue(
      new Response(JSON.stringify(responseBody), { status: 200 }),
    );

    const result = await client.getServiceDetails(serviceId)();

    expect(E.isRight(result)).toBe(true);
    if (E.isRight(result)) {
      expect(result.right).toMatchObject({
        maxAllowedPaymentAmount: 1000,
        organizationFiscalCode: "01234567890",
        organizationName: "An organization",
        requireSecureChannels: true,
        serviceCategory: "SPECIAL",
        serviceId,
        serviceName: "A service",
      });
      expect(result.right.authorizedCIDRs).toEqual(new Set(["192.0.2.0/24"]));
      expect(result.right.authorizedRecipients).toEqual(
        new Set(["AAABBB00A00A000A" as FiscalCode]),
      );
    }
    expect(fetchApi).toHaveBeenCalledWith(
      `https://apim.example/base/api/v1/internal/services/${serviceId}`,
      { headers: { "Ocp-Apim-Subscription-Key": "subscription-key" } },
    );
  });

  it.each([
    [400, "BAD_REQUEST"],
    [404, "NOT_FOUND"],
    [429, "TOO_MANY_REQUESTS"],
  ] as const)("maps HTTP %i to %s", async (status, expectedKind) => {
    fetchApi.mockResolvedValue(new Response(null, { status }));

    const result = await client.getServiceDetails(serviceId)();

    expect(E.isLeft(result) && result.left.kind).toBe(expectedKind);
  });

  it("rejects a response missing an authorization field", async () => {
    const invalidResponse = {
      ...responseBody,
      authorized_cidrs: undefined,
    };
    fetchApi.mockResolvedValue(
      new Response(JSON.stringify(invalidResponse), { status: 200 }),
    );

    const result = await client.getServiceDetails(serviceId)();

    expect(E.isLeft(result) && result.left.kind).toBe("INVALID_RESPONSE");
  });
});
