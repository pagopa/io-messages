import { Container } from "@azure/cosmos";
import { pino } from "pino";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { CosmosWeeklyEventCollector } from "../event-collector.js";

const patchMock = vi.fn();
const readMock = vi.fn();
const createMock = vi.fn();

const logger = pino({ level: "silent" });
vi.spyOn(logger, "error").mockReturnValue();

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
  test("when the cosmos read fails it should log an error", async () => {
    readMock.mockRejectedValueOnce(new Error("Error from cosmos read"));

    await cosmosCollectorMock.collect(eventsMock);

    expect(logger.error).toHaveBeenCalledTimes(1);
  });

  test("when the cosmos read return a resource undefined it should call the create", async () => {
    readMock.mockResolvedValueOnce({ patch: patchMock, resource: undefined });

    await cosmosCollectorMock.collect(eventsMock);

    expect(readMock).toHaveBeenCalledTimes(1);
    expect(createMock).toHaveBeenCalledTimes(1);
    expect(patchMock).not.toHaveBeenCalled();
    expect(logger.error).not.toHaveBeenCalled();
  });

  test("when the cosmos read return the summary it should call the patch", async () => {
    readMock.mockResolvedValueOnce({
      item: { patch: patchMock },
      resource: { count: 10, id: "2025-W01", year: "2025" },
    });

    await cosmosCollectorMock.collect(eventsMock);

    expect(readMock).toHaveBeenCalledTimes(1);
    expect(createMock).not.toHaveBeenCalled();
    expect(patchMock).toHaveBeenCalledTimes(1);
    expect(logger.error).not.toHaveBeenCalled();
  });

  test("when the cosmos create fails it should log an error", async () => {
    readMock.mockResolvedValueOnce({ patch: patchMock, resource: undefined });
    createMock.mockRejectedValueOnce(new Error("Error from cosmos create"));

    await cosmosCollectorMock.collect(eventsMock);

    expect(readMock).toHaveBeenCalledTimes(1);
    expect(createMock).toHaveBeenCalledTimes(1);
    expect(patchMock).not.toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalledTimes(1);
  });

  test("when the cosmos create goes well it should not log an error", async () => {
    readMock.mockResolvedValueOnce({ patch: patchMock, resource: undefined });

    await cosmosCollectorMock.collect(eventsMock);

    expect(readMock).toHaveBeenCalledTimes(1);
    expect(createMock).toHaveBeenCalledTimes(1);
    expect(patchMock).not.toHaveBeenCalled();
    expect(logger.error).not.toHaveBeenCalled();
  });

  test("when the cosmos patch fails it should log an error", async () => {
    readMock.mockResolvedValueOnce({
      item: { patch: patchMock },
      resource: { count: 10, id: "2025-W01", year: "2025" },
    });
    patchMock.mockRejectedValueOnce(new Error("Error from cosmos patch"));

    await cosmosCollectorMock.collect(eventsMock);

    expect(readMock).toHaveBeenCalledTimes(1);
    expect(createMock).not.toHaveBeenCalled();
    expect(patchMock).toHaveBeenCalledTimes(1);
    expect(logger.error).toHaveBeenCalledTimes(1);
  });

  test("when the cosmos patch goes well it should not log an error", async () => {
    readMock.mockResolvedValueOnce({
      item: { patch: patchMock },
      resource: { count: 10, id: "2025-W01", year: "2025" },
    });

    await cosmosCollectorMock.collect(eventsMock);

    expect(readMock).toHaveBeenCalledTimes(1);
    expect(createMock).not.toHaveBeenCalled();
    expect(patchMock).toHaveBeenCalledTimes(1);
    expect(logger.error).not.toHaveBeenCalled();
  });
});
