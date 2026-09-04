import { ConflictError, GenericError } from "@pagopa/hexagonal-core";
import { err, ok } from "neverthrow";
import { describe, expect, it, vi } from "vitest";

import type { RemoteContentRepository } from "../../ports/rc-configuration.js";

import { makeCreateRcConfigurationUseCase } from "../create-rc-configuration.use-case.js";

const aConfigurationId = "01ARZ3NDEKTSV4RRFFQ69G5FAV";
const aUserId = "user-123";

const aConfigurationCreate = {
  description: "A description",
  disableLollipopFor: [],
  hasPrecondition: "ALWAYS" as const,
  isLollipopEnabled: false,
  name: "A name",
};

const aValidConfiguration = {
  ...aConfigurationCreate,
  configurationId: aConfigurationId,
  id: aConfigurationId,
  userId: aUserId,
};

const makeRepository = (): RemoteContentRepository => ({
  createRemoteContentConfiguration: vi.fn(),
  getRemoteContentConfiguration: vi.fn(),
  listRemoteContentConfigurations: vi.fn(),
  updateRemoteContentConfiguration: vi.fn(),
});

describe("makeCreateRcConfigurationUseCase", () => {
  it("creates a configuration assigning a generated id and the caller user id", async () => {
    const repository = makeRepository();
    vi.mocked(
      repository.createRemoteContentConfiguration,
    ).mockResolvedValueOnce(ok(aValidConfiguration));

    const result = await makeCreateRcConfigurationUseCase(
      repository,
      () => aConfigurationId,
    )({ configuration: aConfigurationCreate, userId: aUserId });

    expect(result.isOk()).toBe(true);
    expect(repository.createRemoteContentConfiguration).toHaveBeenCalledWith(
      aValidConfiguration,
    );
  });

  it("returns repository errors", async () => {
    const repository = makeRepository();
    const error = new ConflictError("already exists");
    vi.mocked(
      repository.createRemoteContentConfiguration,
    ).mockResolvedValueOnce(err(error));

    const result = await makeCreateRcConfigurationUseCase(
      repository,
      () => aConfigurationId,
    )({ configuration: aConfigurationCreate, userId: aUserId });

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(ConflictError);
  });

  it("does not swallow generic repository errors", async () => {
    const repository = makeRepository();
    const error = new GenericError("cosmos unavailable");
    vi.mocked(
      repository.createRemoteContentConfiguration,
    ).mockResolvedValueOnce(err(error));

    const result = await makeCreateRcConfigurationUseCase(
      repository,
      () => aConfigurationId,
    )({ configuration: aConfigurationCreate, userId: aUserId });

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(GenericError);
  });
});
