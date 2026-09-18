import type { RCConfiguration } from "io-messages-common/domain/remote-content";

import { beforeEach, describe, expect, test, vi } from "vitest";

import { UserRCConfigurationRepository } from "../../remote-content.js";
import { AlignRemoteContentConfigurationUseCase } from "../align-remote-content-configuration.js";

const upsertMock = vi.fn();
const repository = {
  upsert: upsertMock,
} as UserRCConfigurationRepository;
const useCase = new AlignRemoteContentConfigurationUseCase(repository);

const configuration = {
  configurationId: "01HMRBX079WA5SGYBQP1A7FSKH",
  userId: "aUserId",
} as RCConfiguration;

describe("AlignRemoteContentConfigurationUseCase", () => {
  beforeEach(() => vi.clearAllMocks());

  test("aligns a remote-content configuration with its user configuration", async () => {
    upsertMock.mockResolvedValueOnce(undefined);

    await useCase.execute(configuration);

    expect(upsertMock).toHaveBeenCalledWith({
      id: configuration.configurationId,
      userId: configuration.userId,
    });
  });

  test("propagates repository failures", async () => {
    const error = new Error("Cosmos upsert failed");
    upsertMock.mockRejectedValueOnce(error);

    await expect(useCase.execute(configuration)).rejects.toThrow(error);
  });
});
