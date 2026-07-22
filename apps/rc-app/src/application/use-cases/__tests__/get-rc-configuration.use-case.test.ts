import {
  GenericError,
  NotFoundError,
  TooManyRequestsError,
} from "@pagopa/hexagonal-core";
import { err, ok } from "neverthrow";
import { describe, expect, it, vi } from "vitest";

import type { RemoteContentRepository } from "../../ports/rc-configuration.js";

import { makeGetRcConfigurationUseCase } from "../get-rc-configuration.use-case.js";

const aConfigurationId = "01ARZ3NDEKTSV4RRFFQ69G5FAV";

const aValidConfiguration = {
  configurationId: aConfigurationId,
  description: "A description",
  disableLollipopFor: [],
  hasPrecondition: "ALWAYS" as const,
  id: "some-id",
  isLollipopEnabled: false,
  name: "A name",
  userId: "user-123",
};

const makeRepository = (): RemoteContentRepository => ({
  getRemoteContentConfiguration: vi.fn(),
});

describe("makeGetRcConfigurationUseCase", () => {
  it("returns the configuration when the repository succeeds", async () => {
    const repository = makeRepository();
    vi.mocked(repository.getRemoteContentConfiguration).mockResolvedValueOnce(
      ok(aValidConfiguration),
    );

    const result = await makeGetRcConfigurationUseCase(repository)({
      configurationId: aConfigurationId,
    });

    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap()).toMatchObject({
      configurationId: aConfigurationId,
    });
    expect(repository.getRemoteContentConfiguration).toHaveBeenCalledWith(
      aConfigurationId,
    );
  });

  it("returns a NotFoundError when the repository returns NotFoundError", async () => {
    const repository = makeRepository();
    vi.mocked(repository.getRemoteContentConfiguration).mockResolvedValueOnce(
      err(new NotFoundError("rc-configuration", "not found")),
    );

    const result = await makeGetRcConfigurationUseCase(repository)({
      configurationId: aConfigurationId,
    });

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(NotFoundError);
  });

  it("returns a GenericError when the repository returns a GenericError", async () => {
    const repository = makeRepository();
    vi.mocked(repository.getRemoteContentConfiguration).mockResolvedValueOnce(
      err(new GenericError("cosmos unavailable")),
    );

    const result = await makeGetRcConfigurationUseCase(repository)({
      configurationId: aConfigurationId,
    });

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(GenericError);
  });

  it("returns a TooManyRequestsError when the repository returns TooManyRequestsError", async () => {
    const repository = makeRepository();
    vi.mocked(repository.getRemoteContentConfiguration).mockResolvedValueOnce(
      err(new TooManyRequestsError()),
    );

    const result = await makeGetRcConfigurationUseCase(repository)({
      configurationId: aConfigurationId,
    });

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(TooManyRequestsError);
  });
});
