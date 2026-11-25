import { GenericError, TooManyRequestsError } from "@pagopa/hexagonal-core";
import { err, ok } from "neverthrow";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { RemoteContentRepository } from "../../ports/rc-configuration.js";
import type { UserRCConfigurationRepository } from "../../ports/user-rc-configuration.js";

import { makeListRcConfigurationUseCase } from "../list-rc-confguration.use-case.js";

const aConfigurationId = "01ARZ3NDEKTSV4RRFFQ69G5FAV";
const anotherConfigurationId = "01BX5ZZKBKACTAV9WEVGEMMVRZ";
const aUserId = "user-123";

const aValidConfiguration = {
  configurationId: aConfigurationId,
  description: "A description",
  disableLollipopFor: [],
  hasPrecondition: "ALWAYS" as const,
  id: aConfigurationId,
  isLollipopEnabled: false,
  name: "A name",
  userId: "stored-user",
};

const anotherValidConfiguration = {
  ...aValidConfiguration,
  configurationId: anotherConfigurationId,
  id: anotherConfigurationId,
};

const makeRemoteContentRepository = (): RemoteContentRepository => ({
  createRemoteContentConfiguration: vi.fn(),
  getRemoteContentConfiguration: vi.fn(),
  listRemoteContentConfigurations: vi.fn(),
  updateRemoteContentConfiguration: vi.fn(),
});

const makeUserRCConfigurationRepository =
  (): UserRCConfigurationRepository => ({
    listUserRCConfigurations: vi.fn(),
  });

const logger = { trackEvent: vi.fn() };

describe("makeListRcConfigurationUseCase", () => {
  beforeEach(() => {
    logger.trackEvent.mockClear();
  });

  it("lists the configurations linked to the user", async () => {
    const userRCConfigurationRepository = makeUserRCConfigurationRepository();
    const remoteContentRepository = makeRemoteContentRepository();
    vi.mocked(
      userRCConfigurationRepository.listUserRCConfigurations,
    ).mockResolvedValueOnce(
      ok([
        { id: aConfigurationId, userId: aUserId },
        { id: anotherConfigurationId, userId: aUserId },
      ]),
    );
    vi.mocked(
      remoteContentRepository.listRemoteContentConfigurations,
    ).mockResolvedValueOnce(
      ok([aValidConfiguration, anotherValidConfiguration]),
    );

    const result = await makeListRcConfigurationUseCase(
      userRCConfigurationRepository,
      remoteContentRepository,
      logger,
    )({ userId: aUserId });

    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap()).toStrictEqual([
      { ...aValidConfiguration, userId: aUserId },
      { ...anotherValidConfiguration, userId: aUserId },
    ]);
    expect(
      remoteContentRepository.listRemoteContentConfigurations,
    ).toHaveBeenCalledWith([aConfigurationId, anotherConfigurationId]);
    expect(logger.trackEvent).not.toHaveBeenCalled();
  });

  it("tracks unresolved configuration IDs once without changing the list", async () => {
    const thirdConfigurationId = "01BX5ZZKBKACTAV9WEVGEMMVS0";
    const userRCConfigurationRepository = makeUserRCConfigurationRepository();
    const remoteContentRepository = makeRemoteContentRepository();
    vi.mocked(
      userRCConfigurationRepository.listUserRCConfigurations,
    ).mockResolvedValueOnce(
      ok([
        { id: aConfigurationId, userId: aUserId },
        { id: anotherConfigurationId, userId: aUserId },
        { id: anotherConfigurationId, userId: aUserId },
        { id: thirdConfigurationId, userId: aUserId },
      ]),
    );
    vi.mocked(
      remoteContentRepository.listRemoteContentConfigurations,
    ).mockResolvedValueOnce(ok([aValidConfiguration]));

    const result = await makeListRcConfigurationUseCase(
      userRCConfigurationRepository,
      remoteContentRepository,
      logger,
    )({ userId: aUserId });

    expect(result._unsafeUnwrap()).toStrictEqual([
      { ...aValidConfiguration, userId: aUserId },
    ]);
    expect(logger.trackEvent).toHaveBeenCalledExactlyOnceWith({
      name: "ListRcConfigurationUseCase.listRemoteContentConfigurations.failed.notFound",
      properties: {
        missingConfigurationIds: JSON.stringify([
          anotherConfigurationId,
          thirdConfigurationId,
        ]),
        missingCount: 2,
      },
    });
  });

  it("ignores malformed linked configuration IDs", async () => {
    const userRCConfigurationRepository = makeUserRCConfigurationRepository();
    const remoteContentRepository = makeRemoteContentRepository();
    vi.mocked(
      userRCConfigurationRepository.listUserRCConfigurations,
    ).mockResolvedValueOnce(
      ok([
        { id: aConfigurationId, userId: aUserId },
        { id: "not-a-configuration-id", userId: aUserId },
      ]),
    );
    vi.mocked(
      remoteContentRepository.listRemoteContentConfigurations,
    ).mockResolvedValueOnce(ok([aValidConfiguration]));

    const result = await makeListRcConfigurationUseCase(
      userRCConfigurationRepository,
      remoteContentRepository,
      logger,
    )({ userId: aUserId });

    expect(result.isOk()).toBe(true);
    expect(
      remoteContentRepository.listRemoteContentConfigurations,
    ).toHaveBeenCalledWith([aConfigurationId]);
    expect(logger.trackEvent).not.toHaveBeenCalled();
  });

  it("returns an empty list when the user has no linked configurations", async () => {
    const userRCConfigurationRepository = makeUserRCConfigurationRepository();
    const remoteContentRepository = makeRemoteContentRepository();
    vi.mocked(
      userRCConfigurationRepository.listUserRCConfigurations,
    ).mockResolvedValueOnce(ok([]));
    vi.mocked(
      remoteContentRepository.listRemoteContentConfigurations,
    ).mockResolvedValueOnce(ok([]));

    const result = await makeListRcConfigurationUseCase(
      userRCConfigurationRepository,
      remoteContentRepository,
      logger,
    )({ userId: aUserId });

    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap()).toStrictEqual([]);
    expect(
      remoteContentRepository.listRemoteContentConfigurations,
    ).toHaveBeenCalledWith([]);
  });

  it("propagates user configuration lookup errors", async () => {
    const userRCConfigurationRepository = makeUserRCConfigurationRepository();
    const remoteContentRepository = makeRemoteContentRepository();
    vi.mocked(
      userRCConfigurationRepository.listUserRCConfigurations,
    ).mockResolvedValueOnce(err(new GenericError("cosmos unavailable")));

    const result = await makeListRcConfigurationUseCase(
      userRCConfigurationRepository,
      remoteContentRepository,
      logger,
    )({ userId: aUserId });

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(GenericError);
    expect(
      remoteContentRepository.listRemoteContentConfigurations,
    ).not.toHaveBeenCalled();
  });

  it("propagates RC configuration lookup errors", async () => {
    const userRCConfigurationRepository = makeUserRCConfigurationRepository();
    const remoteContentRepository = makeRemoteContentRepository();
    vi.mocked(
      userRCConfigurationRepository.listUserRCConfigurations,
    ).mockResolvedValueOnce(ok([{ id: aConfigurationId, userId: aUserId }]));
    vi.mocked(
      remoteContentRepository.listRemoteContentConfigurations,
    ).mockResolvedValueOnce(err(new TooManyRequestsError()));

    const result = await makeListRcConfigurationUseCase(
      userRCConfigurationRepository,
      remoteContentRepository,
      logger,
    )({ userId: aUserId });

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(TooManyRequestsError);
    expect(logger.trackEvent).not.toHaveBeenCalled();
  });
});
