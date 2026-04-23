/* eslint-disable max-lines-per-function */
import { InvocationContext } from "@azure/functions";
import { afterEach, describe, expect, test, vi } from "vitest";

import { ErrorInternal } from "../../../domain/error";
import { massiveJobIDSchema } from "../../../domain/massive-jobs";
import { TelemetryService } from "../../../domain/telemetry";
import { ProcessMassiveJobUseCase } from "../../../domain/use-cases/process-massive-job";
import { makeProcessMassiveJobHandler } from "../process-massive-job";

const context = new InvocationContext();

const telemetryServiceMock: TelemetryService = {
  trackEvent: vi.fn(),
};

const useCaseMock: Pick<ProcessMassiveJobUseCase, "execute"> = {
  execute: vi.fn(),
};

const handler = makeProcessMassiveJobHandler(
  telemetryServiceMock,
  useCaseMock as ProcessMassiveJobUseCase,
);

const aValidJobId = massiveJobIDSchema.parse("01ARZ3NDEKTSV4RRFFQ69G5FAV");

const aValidMessage = {
  jobId: aValidJobId,
  message: "Test notification message",
  scheduledTimestamp: 1700000100,
  tags: ["aaa", "bbb"],
  title: "Test notification title",
};

const afterEachCleanup = () => {
  vi.clearAllMocks();
};

describe("makeProcessMassiveJobHandler", () => {
  afterEach(afterEachCleanup);

  test("should track event and return when message schema is invalid", async () => {
    const invalidMessage = {
      ...aValidMessage,
      jobId: "not-a-ulid",
    };

    await handler(invalidMessage, context);

    expect(telemetryServiceMock.trackEvent).toHaveBeenCalledWith({
      name: "massiveJob.ProcessMassiveJob.queueMessage.invalid",
      properties: expect.objectContaining({
        issues: expect.any(Array),
      }),
    });
    expect(useCaseMock.execute).not.toHaveBeenCalled();
  });
  test("should process valid message and execute use case", async () => {
    const progressIDs = ["progress-id-1", "progress-id-2"];
    vi.mocked(useCaseMock.execute).mockResolvedValueOnce(progressIDs);

    await handler(aValidMessage, context);

    expect(useCaseMock.execute).toHaveBeenCalledWith(
      aValidMessage.jobId,
      aValidMessage.title,
      aValidMessage.message,
      aValidMessage.scheduledTimestamp,
      aValidMessage.tags,
      telemetryServiceMock,
    );
    expect(telemetryServiceMock.trackEvent).not.toHaveBeenCalled();
  });

  test("should track event when use case returns ErrorInternal", async () => {
    const error = new ErrorInternal(
      "Failed to process massive job",
      "Notification hub error",
    );
    vi.mocked(useCaseMock.execute).mockResolvedValueOnce(error);

    await handler(aValidMessage, context);

    expect(useCaseMock.execute).toHaveBeenCalledWith(
      aValidMessage.jobId,
      aValidMessage.title,
      aValidMessage.message,
      aValidMessage.scheduledTimestamp,
      aValidMessage.tags,
      telemetryServiceMock,
    );
    expect(telemetryServiceMock.trackEvent).toHaveBeenCalledWith({
      name: "massiveJob.ProcessMassiveJob.failed",
      properties: {
        errorCause: error.cause,
        errorKind: "ErrorInternal",
        jobId: aValidMessage.jobId,
        scheduledTimestamp: aValidMessage.scheduledTimestamp,
        tags: aValidMessage.tags,
      },
    });
  });

  test("should not throw when telemetry fails during invalid message handling", async () => {
    const invalidMessage = {
      ...aValidMessage,
      jobId: "invalid",
    };
    vi.mocked(telemetryServiceMock.trackEvent).mockImplementationOnce(() => {
      throw new Error("Telemetry failed");
    });

    // Should throw because telemetry.trackEvent is not caught in the handler
    await expect(handler(invalidMessage, context)).rejects.toThrow(
      "Telemetry failed",
    );
  });
});
