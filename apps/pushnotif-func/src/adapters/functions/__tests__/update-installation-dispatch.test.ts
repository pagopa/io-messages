import { InvocationContext, StorageQueueOutput } from "@azure/functions";
import { afterEach, describe, expect, test, vi } from "vitest";

import { TelemetryService } from "../../../domain/telemetry";
import getInstallationUpdateDispatcher from "../update-installation-dispatch";

const aValidInstallationId =
  "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";

const aTimeToReach = 1000;

const aValidDocument = {
  createdAt: 100,
  id: aValidInstallationId,
  nhPartition: "1",
  platform: "apns",
  updatedAt: 500, // older than aTimeToReach, should be queued
};

const telemetryServiceMock: TelemetryService = {
  trackEvent: vi.fn(),
};

const queueOutputMock = {} as StorageQueueOutput;

const invocationContext = new InvocationContext();
vi.spyOn(invocationContext.extraOutputs, "set");

const handler = getInstallationUpdateDispatcher(
  telemetryServiceMock,
  aTimeToReach,
  queueOutputMock,
);

describe("getInstallationUpdateDispatcher", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  test("should queue a valid installation older than timeToReach", async () => {
    await handler([aValidDocument], invocationContext);

    expect(invocationContext.extraOutputs.set).toHaveBeenCalledWith(
      queueOutputMock,
      [{ installationId: aValidInstallationId, platform: "apns" }],
    );

    expect(telemetryServiceMock.trackEvent).not.toHaveBeenCalled();
  });

  test("should not queue a valid installation newer than timeToReach", async () => {
    const recentDocument = { ...aValidDocument, updatedAt: aTimeToReach + 1 };

    await handler([recentDocument], invocationContext);

    expect(invocationContext.extraOutputs.set).toHaveBeenCalledWith(
      queueOutputMock,
      [],
    );

    expect(telemetryServiceMock.trackEvent).not.toHaveBeenCalled();
  });

  test("should track a telemetry event and skip invalid documents", async () => {
    const invalidDocument = { invalidField: "value" };

    await handler([invalidDocument], invocationContext);

    expect(telemetryServiceMock.trackEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "installation.summary.validation.error",
        properties: expect.objectContaining({
          message: "Invalid installation summary",
        }),
      }),
    );

    expect(invocationContext.extraOutputs.set).toHaveBeenCalledWith(
      queueOutputMock,
      [],
    );
  });

  test("should process multiple documents and queue only valid ones older than timeToReach", async () => {
    const recentDocument = { ...aValidDocument, updatedAt: aTimeToReach + 1 };
    const invalidDocument = { invalidField: "value" };
    const fcmDocument = { ...aValidDocument, platform: "FcmV1" };

    await handler(
      [aValidDocument, recentDocument, invalidDocument, fcmDocument],
      invocationContext,
    );

    expect(invocationContext.extraOutputs.set).toHaveBeenCalledWith(
      queueOutputMock,
      [
        { installationId: aValidInstallationId, platform: "apns" },
        { installationId: aValidInstallationId, platform: "fcmv1" },
      ],
    );

    expect(telemetryServiceMock.trackEvent).toHaveBeenCalledTimes(1);
  });

  test("should set an empty array when no documents are provided", async () => {
    await handler([], invocationContext);

    expect(invocationContext.extraOutputs.set).toHaveBeenCalledWith(
      queueOutputMock,
      [],
    );

    expect(telemetryServiceMock.trackEvent).not.toHaveBeenCalled();
  });
});
