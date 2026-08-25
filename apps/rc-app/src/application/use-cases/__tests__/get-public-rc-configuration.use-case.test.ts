import {
  ForbiddenError,
  GenericError,
  NotFoundError,
  TooManyRequestsError,
} from "@pagopa/hexagonal-core";
import { err, ok } from "neverthrow";
import { describe, expect, it, vi } from "vitest";

import type { GetRcConfigurationUseCase } from "../get-rc-configuration.use-case.js";

import { makeGetPublicRcConfigurationUseCase } from "../get-public-rc-configuration.use-case.js";

const aConfigurationId = "01ARZ3NDEKTSV4RRFFQ69G5FAV";
const ownerUserId = "owner-user";

const aValidConfiguration = {
  configurationId: aConfigurationId,
  description: "A description",
  disableLollipopFor: [],
  hasPrecondition: "ALWAYS" as const,
  id: "some-id",
  isLollipopEnabled: false,
  name: "A name",
  userId: ownerUserId,
};

const makeGetRcConfigurationUseCaseMock = () => {
  const getRcConfigurationUseCase: GetRcConfigurationUseCase = vi.fn();
  return getRcConfigurationUseCase;
};

describe("makeGetPublicRcConfigurationUseCase", () => {
  it("returns the configuration to its owner", async () => {
    const getRcConfigurationUseCase = makeGetRcConfigurationUseCaseMock();
    vi.mocked(getRcConfigurationUseCase).mockResolvedValueOnce(
      ok(aValidConfiguration),
    );

    const result = await makeGetPublicRcConfigurationUseCase(
      getRcConfigurationUseCase,
    )({
      configurationId: aConfigurationId,
      isInternalUser: false,
      userId: ownerUserId,
    });

    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap()).toEqual(aValidConfiguration);
    expect(getRcConfigurationUseCase).toHaveBeenCalledWith({
      configurationId: aConfigurationId,
    });
  });

  it("returns the configuration to the internal user regardless of ownership", async () => {
    const getRcConfigurationUseCase = makeGetRcConfigurationUseCaseMock();
    vi.mocked(getRcConfigurationUseCase).mockResolvedValueOnce(
      ok(aValidConfiguration),
    );

    const result = await makeGetPublicRcConfigurationUseCase(
      getRcConfigurationUseCase,
    )({
      configurationId: aConfigurationId,
      isInternalUser: true,
      userId: "internal-user",
    });

    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap()).toEqual(aValidConfiguration);
  });

  it("returns ForbiddenError when the configuration belongs to another user", async () => {
    const getRcConfigurationUseCase = makeGetRcConfigurationUseCaseMock();
    vi.mocked(getRcConfigurationUseCase).mockResolvedValueOnce(
      ok(aValidConfiguration),
    );

    const result = await makeGetPublicRcConfigurationUseCase(
      getRcConfigurationUseCase,
    )({
      configurationId: aConfigurationId,
      isInternalUser: false,
      userId: "another-user",
    });

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(ForbiddenError);
  });

  it.each([
    new NotFoundError("rc-configuration", "not found"),
    new GenericError("cosmos unavailable"),
    new TooManyRequestsError(),
  ])("propagates $kind from the underlying use case", async (error) => {
    const getRcConfigurationUseCase = makeGetRcConfigurationUseCaseMock();
    vi.mocked(getRcConfigurationUseCase).mockResolvedValueOnce(err(error));

    const result = await makeGetPublicRcConfigurationUseCase(
      getRcConfigurationUseCase,
    )({
      configurationId: aConfigurationId,
      isInternalUser: false,
      userId: ownerUserId,
    });

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBe(error);
  });
});
