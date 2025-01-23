import { Container } from "@azure/cosmos";
import { describe, test, vi, expect, beforeEach } from "vitest";
import { CosmosWeeklyEventCollector } from "../event-collector.js";

const patchMock = vi.fn();
const readMock = vi.fn();
const createMock = vi.fn();

const containerMock = {
  item: () => ({
    read: readMock,
  }),
  items: {
    create: createMock,
  },
} as unknown as Container;

const cosmosCollectorMock = new CosmosWeeklyEventCollector(containerMock);

const eventsMock = [{ foo: "bar" }];

beforeEach(vi.resetAllMocks);

describe("CosmosWeeklyEventCollector.collect", () => {
  test("when the cosmos read fails it should thwor an error", async () => {
    readMock.mockReturnValueOnce(
      Promise.reject(new Error("Error from cosmos read")),
    );

    await expect(cosmosCollectorMock.collect(eventsMock)).rejects.toEqual(
      new Error("Error from cosmos read"),
    );
  });

  test("when the cosmos read return a resource undefined it should call the create", async () => {
    readMock.mockImplementationOnce(() =>
      Promise.resolve({ resource: undefined, patch: patchMock }),
    );

    await cosmosCollectorMock.collect(eventsMock);

    expect(readMock).toHaveBeenCalledTimes(1);
    expect(createMock).toHaveBeenCalledTimes(1);
    expect(patchMock).not.toHaveBeenCalled();
  });

  test("when the cosmos read return the summary it should call the patch", async () => {
    readMock.mockReturnValueOnce(
      Promise.resolve({
        resource: { year: "2025", id: "2025-W01", count: 10 },
        item: { patch: patchMock },
      }),
    );

    await cosmosCollectorMock.collect(eventsMock);

    expect(readMock).toHaveBeenCalledTimes(1);
    expect(createMock).not.toHaveBeenCalled();
    expect(patchMock).toHaveBeenCalledTimes(1);
  });

  test("when the cosmos create fails it should throw an error", async () => {
    readMock.mockImplementationOnce(() =>
      Promise.resolve({ resource: undefined, patch: patchMock }),
    );
    createMock.mockReturnValueOnce(
      Promise.reject(new Error("Error from cosmos create")),
    );

    await expect(cosmosCollectorMock.collect(eventsMock)).rejects.toEqual(
      new Error("Error from cosmos create"),
    );
    expect(readMock).toHaveBeenCalledTimes(1);
    expect(createMock).toHaveBeenCalledTimes(1);
    expect(patchMock).not.toHaveBeenCalled();
  });

  test("when the cosmos create goes well it should not throw an error", async () => {
    readMock.mockImplementationOnce(() =>
      Promise.resolve({ resource: undefined, patch: patchMock }),
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
        resource: { year: "2025", id: "2025-W01", count: 10 },
        item: { patch: patchMock },
      }),
    );
    patchMock.mockReturnValueOnce(
      Promise.reject(new Error("Error from cosmos patch")),
    );

    await expect(cosmosCollectorMock.collect(eventsMock)).rejects.toEqual(
      new Error("Error from cosmos patch"),
    );
    expect(readMock).toHaveBeenCalledTimes(1);
    expect(createMock).not.toHaveBeenCalled();
    expect(patchMock).toHaveBeenCalledTimes(1);
  });

  test("when the cosmos patch goes well it should not throw an error", async () => {
    readMock.mockReturnValueOnce(
      Promise.resolve({
        resource: { year: "2025", id: "2025-W01", count: 10 },
        item: { patch: patchMock },
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
