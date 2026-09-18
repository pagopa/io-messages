import { Container } from "@azure/cosmos";
import { describe, expect, test, vi } from "vitest";

import { CosmosUserRCConfigurationRepository } from "../user-rc-configuration.js";

const upsertMock = vi.fn();
const container = {
  items: {
    upsert: upsertMock,
  },
} as unknown as Container;

const repository = new CosmosUserRCConfigurationRepository(container);
const configuration = {
  id: "01HMRBX079WA5SGYBQP1A7FSKH",
  userId: "aUserId",
};

describe("CosmosUserRCConfigurationRepository", () => {
  test("upserts the user remote-content configuration", async () => {
    upsertMock.mockResolvedValueOnce(undefined);

    await repository.upsert(configuration);

    expect(upsertMock).toHaveBeenCalledWith(configuration);
  });

  test("propagates Cosmos errors", async () => {
    const error = new Error("Cosmos upsert failed");
    upsertMock.mockRejectedValueOnce(error);

    await expect(repository.upsert(configuration)).rejects.toThrow(error);
  });
});
