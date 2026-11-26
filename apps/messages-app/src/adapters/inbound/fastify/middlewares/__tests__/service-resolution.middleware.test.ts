import {
  ForbiddenError,
  GenericError,
  NotFoundError,
  TooManyRequestsError,
} from "@pagopa/hexagonal-core";
import { err, ok } from "neverthrow";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type {
  ServicesCmsDetail,
  ServicesCmsRepository,
} from "../../../../../application/ports/services-cms.js";

import { MalformedEntityError } from "../../../../../application/ports/error.js";
import { makeServiceResolutionMiddleware } from "../service-resolution.middleware.js";

const service: ServicesCmsDetail = {
  authorized_cidrs: ["192.0.2.0/24"],
  authorized_recipients: [],
  description: "Service description",
  id: "service-id",
  last_update: "2026-01-01T00:00:00.000Z",
  max_allowed_payment_amount: 10_000,
  metadata: { scope: "NATIONAL" },
  name: "Service",
  organization: { fiscal_code: "01234567890", name: "Organization" },
  require_secure_channel: false,
  status: { value: "published" },
};

describe("makeServiceResolutionMiddleware", () => {
  let repository: ServicesCmsRepository;

  beforeEach(() => {
    repository = {
      getServiceCmsDetails: vi.fn().mockResolvedValue(ok(service)),
      getServicesCmsDetailsByServiceIds: vi.fn(),
    };
  });

  const executeMiddleware = () =>
    makeServiceResolutionMiddleware(repository)({
      context: { subscriptionId: "subscription-id" },
      payload: {},
    });

  it("resolves the subscription to the canonical service identity and allowlist", async () => {
    const result = await executeMiddleware();

    expect(repository.getServiceCmsDetails).toHaveBeenCalledWith(
      "subscription-id",
    );
    expect(result._unsafeUnwrap()).toEqual({
      service: {
        authorizedCidrs: ["192.0.2.0/24"],
        id: "service-id",
      },
    });
  });

  it("rejects a missing service with ForbiddenError", async () => {
    vi.mocked(repository.getServiceCmsDetails).mockResolvedValue(
      err(new NotFoundError("service", "Service not found")),
    );

    const result = await executeMiddleware();

    expect(result._unsafeUnwrapErr()).toBeInstanceOf(ForbiddenError);
  });

  it.each([
    ["generic", new GenericError("Service lookup failed")],
    ["malformed", new MalformedEntityError("Invalid service")],
    ["throttled", new TooManyRequestsError()],
  ])("normalizes %s lookup failures to server errors", async (_, error) => {
    vi.mocked(repository.getServiceCmsDetails).mockResolvedValue(err(error));

    const result = await executeMiddleware();

    expect(result._unsafeUnwrapErr()).toBeInstanceOf(GenericError);
    expect(result._unsafeUnwrapErr().message).toContain(error.message);
  });
});
