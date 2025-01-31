import { Container } from "@azure/cosmos";
import { pino } from "pino";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { CosmosWeeklyEventCollector } from "../event-collector.js";

const patchMock = vi.fn();
const readMock = vi.fn();
const createMock = vi.fn();

const logger = pino();

const containerMock = {
  item: () => ({
    read: readMock,
  }),
  items: {
    create: createMock,
  },
} as unknown as Container;

const cosmosCollectorMock = new CosmosWeeklyEventCollector(
  containerMock,
  logger,
);

const eventsMock = [{ foo: "bar" }];

beforeEach(vi.resetAllMocks);

describe("CosmosWeeklyEventCollector.collect", () => {
  test("when the cosmos read fails it should thwor an error", async () => {
    readMock.mockReturnValueOnce(
      Promise.reject(new Error("Error from cosmos read")),
    );

    await expect(cosmosCollectorMock.collect(eventsMock)).rejects.toEqual(
      new Error(
        "Error trying to collect messages-summary | Error: Error from cosmos read",
      ),
    );
  });

  test("when the cosmos read return a resource undefined it should call the create", async () => {
    readMock.mockImplementationOnce(() =>
      Promise.resolve({ patch: patchMock, resource: undefined }),
    );

    await cosmosCollectorMock.collect(eventsMock);

    expect(readMock).toHaveBeenCalledTimes(1);
    expect(createMock).toHaveBeenCalledTimes(1);
    expect(patchMock).not.toHaveBeenCalled();
  });

  test("when the cosmos read return the summary it should call the patch", async () => {
    readMock.mockReturnValueOnce(
      Promise.resolve({
        item: { patch: patchMock },
        resource: { count: 10, id: "2025-W01", year: "2025" },
      }),
    );

    await cosmosCollectorMock.collect(eventsMock);

    expect(readMock).toHaveBeenCalledTimes(1);
    expect(createMock).not.toHaveBeenCalled();
    expect(patchMock).toHaveBeenCalledTimes(1);
  });

  test("when the cosmos create fails it should throw an error", async () => {
    readMock.mockImplementationOnce(() =>
      Promise.resolve({ patch: patchMock, resource: undefined }),
    );
    createMock.mockReturnValueOnce(
      Promise.reject(new Error("Error from cosmos create")),
    );

    await expect(cosmosCollectorMock.collect(eventsMock)).rejects.toEqual(
      new Error(
        "Error trying to collect messages-summary | Error: Error from cosmos create",
      ),
    );
    expect(readMock).toHaveBeenCalledTimes(1);
    expect(createMock).toHaveBeenCalledTimes(1);
    expect(patchMock).not.toHaveBeenCalled();
  });

  test("when the cosmos create goes well it should not throw an error", async () => {
    readMock.mockImplementationOnce(() =>
      Promise.resolve({ patch: patchMock, resource: undefined }),
    );

    await expect(cosmosCollectorMock.collect(eventsMock)).resolves.toEqual(
      undefined,
    );
    expect(readMock).toHaveBeenCalledTimes(1);
    expect(createMock).toHaveBeenCalledTimes(1);
    expect(patchMock).not.toHaveBeenCalled();
  });

  test("when the cosmos patch fails it should throw an error", async () => {
    readMock.mockReturnValueOnce(
      Promise.resolve({
        item: { patch: patchMock },
        resource: { count: 10, id: "2025-W01", year: "2025" },
      }),
    );
    patchMock.mockReturnValueOnce(
      Promise.reject(new Error("Error from cosmos patch")),
    );

    await expect(cosmosCollectorMock.collect(eventsMock)).rejects.toEqual(
      new Error(
        "Error trying to collect messages-summary | Error: Error from cosmos patch",
      ),
    );
    expect(readMock).toHaveBeenCalledTimes(1);
    expect(createMock).not.toHaveBeenCalled();
    expect(patchMock).toHaveBeenCalledTimes(1);
  });

  test("when the cosmos patch goes well it should not throw an error", async () => {
    readMock.mockReturnValueOnce(
      Promise.resolve({
        item: { patch: patchMock },
        resource: { count: 10, id: "2025-W01", year: "2025" },
      }),
    );

    await expect(cosmosCollectorMock.collect(eventsMock)).resolves.toEqual(
      undefined,
    );
    expect(readMock).toHaveBeenCalledTimes(1);
    expect(createMock).not.toHaveBeenCalled();
    expect(patchMock).toHaveBeenCalledTimes(1);
  });
});
