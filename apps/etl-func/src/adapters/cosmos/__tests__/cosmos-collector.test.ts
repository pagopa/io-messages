import { ApplicationInsights } from "@/adapters/appinsights/appinsights.js";
import { Container } from "@azure/cosmos";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { CosmosIngestionCollector } from "../event-collector.js";

const createMock = vi.fn();

const mocks = vi.hoisted(() => ({
  TelemetryClient: vi.fn().mockImplementation(() => ({
    trackEvent: vi.fn(),
  })),
}));

const telemetryServiceMock = new ApplicationInsights(
  new mocks.TelemetryClient(),
);

const telemetryTrackEventMock = vi
  .spyOn(telemetryServiceMock, "trackEvent")
  .mockResolvedValue();

const containerMock = {
  items: {
    create: createMock,
  },
} as unknown as Container;

const cosmosCollectorMock = new CosmosIngestionCollector(
  containerMock,
  telemetryServiceMock,
);

beforeEach(vi.resetAllMocks);

describe("CosmosSummaryCollector.collect", () => {
  test("when the cosmos create resolves, the collect method should not track an event", async () => {
    await cosmosCollectorMock.collect(2);

    expect(createMock).toHaveBeenCalledTimes(1);
    expect(telemetryTrackEventMock).not.toHaveBeenCalled();
  });

  test("when the cosmos create fails it should track an event", async () => {
    createMock.mockRejectedValueOnce(new Error("Error from cosmos create"));

    await cosmosCollectorMock.collect(2);

    expect(createMock).toHaveBeenCalledTimes(1);
    expect(telemetryTrackEventMock).toHaveBeenCalledTimes(1);
  });
});
