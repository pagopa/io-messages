import type { Logger } from "@pagopa/hexagonal-core/domain/ports";

import {
  ForbiddenError,
  GenericError,
  NotFoundError,
  TooManyRequestsError,
} from "@pagopa/hexagonal-core";
import { err, ok } from "neverthrow";
import { describe, expect, it, vi } from "vitest";

import type { RemoteContentRepository } from "../../ports/rc-configuration.js";

import { makeUpdateRcConfigurationUseCase } from "../update-rc-configuration.use-case.js";

const aConfigurationId = "01ARZ3NDEKTSV4RRFFQ69G5FAV";
const aUserId = "user-123";

const aValidConfiguration = {
  configurationId: aConfigurationId,
  description: "A description",
  disableLollipopFor: [],
  hasPrecondition: "ALWAYS" as const,
  id: aConfigurationId,
  isLollipopEnabled: false,
  name: "A name",
  userId: aUserId,
};

const aConfigurationUpdate = {
  description: "An updated description",
  disableLollipopFor: [],
  hasPrecondition: "ONCE" as const,
  isLollipopEnabled: true,
  name: "An updated name",
};

const makeRepository = (): RemoteContentRepository => ({
  createRemoteContentConfiguration: vi.fn(),
  getRemoteContentConfiguration: vi.fn(),
  updateRemoteContentConfiguration: vi.fn(),
});

const makeLogger = (): Logger =>
  ({
    trackEvent: vi.fn(),
  }) as unknown as Logger;

const makeValidInput = () => ({
  configuration: aConfigurationUpdate,
  configurationId: aConfigurationId,
  isInternalUser: false,
  userId: aUserId,
});

describe("makeUpdateRcConfigurationUseCase", () => {
  it("updates the configuration when the caller owns it", async () => {
    const logger = makeLogger();
    const repository = makeRepository();
    vi.mocked(repository.getRemoteContentConfiguration).mockResolvedValueOnce(
      ok(aValidConfiguration),
    );
    vi.mocked(
      repository.updateRemoteContentConfiguration,
    ).mockResolvedValueOnce(
      ok({ ...aValidConfiguration, ...aConfigurationUpdate }),
    );

    const result = await makeUpdateRcConfigurationUseCase(
      repository,
      logger,
    )(makeValidInput());

    expect(result.isOk()).toBe(true);
    expect(repository.updateRemoteContentConfiguration).toHaveBeenCalledWith({
      ...aConfigurationUpdate,
      configurationId: aConfigurationId,
      id: aConfigurationId,
      userId: aUserId,
    });
    expect(logger.trackEvent).toHaveBeenCalledWith({
      name: "UpdateRcConfigurationUseCase.failed.update",
      properties: {
        configurationId: aConfigurationId,
        configurationName: aConfigurationUpdate.name,
        userId: aUserId,
      },
    });
  });

  it("updates the configuration preserving the owner when the caller is internal", async () => {
    const logger = makeLogger();
    const repository = makeRepository();
    vi.mocked(repository.getRemoteContentConfiguration).mockResolvedValueOnce(
      ok(aValidConfiguration),
    );
    vi.mocked(
      repository.updateRemoteContentConfiguration,
    ).mockResolvedValueOnce(
      ok({ ...aValidConfiguration, ...aConfigurationUpdate }),
    );

    const result = await makeUpdateRcConfigurationUseCase(
      repository,
      logger,
    )({
      ...makeValidInput(),
      isInternalUser: true,
      userId: "internal-user",
    });

    expect(result.isOk()).toBe(true);
    expect(repository.updateRemoteContentConfiguration).toHaveBeenCalledWith({
      ...aConfigurationUpdate,
      configurationId: aConfigurationId,
      id: aConfigurationId,
      userId: aUserId,
    });
  });

  it("returns ForbiddenError when the caller does not own the configuration", async () => {
    const logger = makeLogger();
    const repository = makeRepository();
    vi.mocked(repository.getRemoteContentConfiguration).mockResolvedValueOnce(
      ok({ ...aValidConfiguration, userId: "another-user" }),
    );

    const result = await makeUpdateRcConfigurationUseCase(
      repository,
      logger,
    )(makeValidInput());

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(ForbiddenError);
    expect(repository.updateRemoteContentConfiguration).not.toHaveBeenCalled();
  });

  it("returns NotFoundError when the configuration does not exist", async () => {
    const logger = makeLogger();
    const repository = makeRepository();
    vi.mocked(repository.getRemoteContentConfiguration).mockResolvedValueOnce(
      err(new NotFoundError("rc-configuration", "not found")),
    );

    const result = await makeUpdateRcConfigurationUseCase(
      repository,
      logger,
    )(makeValidInput());

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(NotFoundError);
    expect(repository.updateRemoteContentConfiguration).not.toHaveBeenCalled();
  });

  it("returns repository update errors without tracking an event", async () => {
    const logger = makeLogger();
    const repository = makeRepository();
    vi.mocked(repository.getRemoteContentConfiguration).mockResolvedValueOnce(
      ok(aValidConfiguration),
    );
    vi.mocked(
      repository.updateRemoteContentConfiguration,
    ).mockResolvedValueOnce(err(new TooManyRequestsError()));

    const result = await makeUpdateRcConfigurationUseCase(
      repository,
      logger,
    )(makeValidInput());

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(TooManyRequestsError);
    expect(logger.trackEvent).not.toHaveBeenCalled();
  });

  it("returns GenericError from the read path", async () => {
    const logger = makeLogger();
    const repository = makeRepository();
    vi.mocked(repository.getRemoteContentConfiguration).mockResolvedValueOnce(
      err(new GenericError("cosmos unavailable")),
    );

    const result = await makeUpdateRcConfigurationUseCase(
      repository,
      logger,
    )(makeValidInput());

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(GenericError);
  });
});
