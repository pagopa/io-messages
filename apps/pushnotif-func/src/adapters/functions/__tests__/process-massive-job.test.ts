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
  body: "Test notification message",
  jobId: aValidJobId,
  scheduledTimestamp: 1700000100,
  tags: ["aaa", "bbb"],
  title: "Test notification title",
};

const afterEachCleanup = () => {
  vi.clearAllMocks();
};

describe("makeProcessMassiveJobHandler", () => {
  afterEach(afterEachCleanup);

  describe("Validation", () => {
    test("should track event and return when message schema is invalid", async () => {
      const invalidMessage = {
        ...aValidMessage,
        jobId: "not-a-ulid",
      };

      await handler(invalidMessage, context);

      expect(telemetryServiceMock.trackEvent).toHaveBeenCalledWith(
        "massiveJobs.invalidProcessMassiveNotificationMessage",
        expect.objectContaining({
          issues: expect.any(Array),
        }),
      );
      expect(useCaseMock.execute).not.toHaveBeenCalled();
    });

    test("should track event when jobId is missing", async () => {
      const invalidMessage = {
        body: "Test message",
        scheduledTimestamp: 1700000100,
        tags: ["aaa"],
        title: "Test title",
      };

      await handler(invalidMessage, context);

      expect(telemetryServiceMock.trackEvent).toHaveBeenCalledWith(
        "massiveJobs.invalidProcessMassiveNotificationMessage",
        expect.objectContaining({
          issues: expect.any(Array),
        }),
      );
      expect(useCaseMock.execute).not.toHaveBeenCalled();
    });

    test("should track event when title is missing", async () => {
      const invalidMessage = {
        body: "Test message",
        jobId: aValidJobId,
        scheduledTimestamp: 1700000100,
        tags: ["aaa"],
      };

      await handler(invalidMessage, context);

      expect(telemetryServiceMock.trackEvent).toHaveBeenCalledWith(
        "massiveJobs.invalidProcessMassiveNotificationMessage",
        expect.objectContaining({
          issues: expect.any(Array),
        }),
      );
      expect(useCaseMock.execute).not.toHaveBeenCalled();
    });

    test("should track event when body is missing", async () => {
      const invalidMessage = {
        jobId: aValidJobId,
        scheduledTimestamp: 1700000100,
        tags: ["aaa"],
        title: "Test title",
      };

      await handler(invalidMessage, context);

      expect(telemetryServiceMock.trackEvent).toHaveBeenCalledWith(
        "massiveJobs.invalidProcessMassiveNotificationMessage",
        expect.objectContaining({
          issues: expect.any(Array),
        }),
      );
      expect(useCaseMock.execute).not.toHaveBeenCalled();
    });

    test("should track event when tags are missing", async () => {
      const invalidMessage = {
        body: "Test message",
        jobId: aValidJobId,
        scheduledTimestamp: 1700000100,
        title: "Test title",
      };

      await handler(invalidMessage, context);

      expect(telemetryServiceMock.trackEvent).toHaveBeenCalledWith(
        "massiveJobs.invalidProcessMassiveNotificationMessage",
        expect.objectContaining({
          issues: expect.any(Array),
        }),
      );
      expect(useCaseMock.execute).not.toHaveBeenCalled();
    });

    test("should track event when scheduledTimestamp is missing", async () => {
      const invalidMessage = {
        body: "Test message",
        jobId: aValidJobId,
        tags: ["aaa"],
        title: "Test title",
      };

      await handler(invalidMessage, context);

      expect(telemetryServiceMock.trackEvent).toHaveBeenCalledWith(
        "massiveJobs.invalidProcessMassiveNotificationMessage",
        expect.objectContaining({
          issues: expect.any(Array),
        }),
      );
      expect(useCaseMock.execute).not.toHaveBeenCalled();
    });

    test("should track event when title is empty", async () => {
      const invalidMessage = {
        ...aValidMessage,
        title: "",
      };

      await handler(invalidMessage, context);

      expect(telemetryServiceMock.trackEvent).toHaveBeenCalledWith(
        "massiveJobs.invalidProcessMassiveNotificationMessage",
        expect.objectContaining({
          issues: expect.any(Array),
        }),
      );
      expect(useCaseMock.execute).not.toHaveBeenCalled();
    });

    test("should track event when body is empty", async () => {
      const invalidMessage = {
        ...aValidMessage,
        body: "",
      };

      await handler(invalidMessage, context);

      expect(telemetryServiceMock.trackEvent).toHaveBeenCalledWith(
        "massiveJobs.invalidProcessMassiveNotificationMessage",
        expect.objectContaining({
          issues: expect.any(Array),
        }),
      );
      expect(useCaseMock.execute).not.toHaveBeenCalled();
    });

    test("should track event when tags array is empty", async () => {
      const invalidMessage = {
        ...aValidMessage,
        tags: [],
      };

      await handler(invalidMessage, context);

      expect(telemetryServiceMock.trackEvent).toHaveBeenCalledWith(
        "massiveJobs.invalidProcessMassiveNotificationMessage",
        expect.objectContaining({
          issues: expect.any(Array),
        }),
      );
      expect(useCaseMock.execute).not.toHaveBeenCalled();
    });

    test("should track event when scheduledTimestamp is not a positive integer", async () => {
      const invalidMessage = {
        ...aValidMessage,
        scheduledTimestamp: -100,
      };

      await handler(invalidMessage, context);

      expect(telemetryServiceMock.trackEvent).toHaveBeenCalledWith(
        "massiveJobs.invalidProcessMassiveNotificationMessage",
        expect.objectContaining({
          issues: expect.any(Array),
        }),
      );
      expect(useCaseMock.execute).not.toHaveBeenCalled();
    });

    test("should track event when scheduledTimestamp is zero", async () => {
      const invalidMessage = {
        ...aValidMessage,
        scheduledTimestamp: 0,
      };

      await handler(invalidMessage, context);

      expect(telemetryServiceMock.trackEvent).toHaveBeenCalledWith(
        "massiveJobs.invalidProcessMassiveNotificationMessage",
        expect.objectContaining({
          issues: expect.any(Array),
        }),
      );
      expect(useCaseMock.execute).not.toHaveBeenCalled();
    });

    test("should track event when scheduledTimestamp is a decimal", async () => {
      const invalidMessage = {
        ...aValidMessage,
        scheduledTimestamp: 1700000100.5,
      };

      await handler(invalidMessage, context);

      expect(telemetryServiceMock.trackEvent).toHaveBeenCalledWith(
        "massiveJobs.invalidProcessMassiveNotificationMessage",
        expect.objectContaining({
          issues: expect.any(Array),
        }),
      );
      expect(useCaseMock.execute).not.toHaveBeenCalled();
    });

    test("should track event when tags contain empty strings", async () => {
      const invalidMessage = {
        ...aValidMessage,
        tags: ["aaa", "", "bbb"],
      };

      await handler(invalidMessage, context);

      expect(telemetryServiceMock.trackEvent).toHaveBeenCalledWith(
        "massiveJobs.invalidProcessMassiveNotificationMessage",
        expect.objectContaining({
          issues: expect.any(Array),
        }),
      );
      expect(useCaseMock.execute).not.toHaveBeenCalled();
    });

    test("should track event when title exceeds max length (500)", async () => {
      const invalidMessage = {
        ...aValidMessage,
        title: "a".repeat(501),
      };

      await handler(invalidMessage, context);

      expect(telemetryServiceMock.trackEvent).toHaveBeenCalledWith(
        "massiveJobs.invalidProcessMassiveNotificationMessage",
        expect.objectContaining({
          issues: expect.any(Array),
        }),
      );
      expect(useCaseMock.execute).not.toHaveBeenCalled();
    });

    test("should track event when body exceeds max length (1000)", async () => {
      const invalidMessage = {
        ...aValidMessage,
        body: "a".repeat(1001),
      };

      await handler(invalidMessage, context);

      expect(telemetryServiceMock.trackEvent).toHaveBeenCalledWith(
        "massiveJobs.invalidProcessMassiveNotificationMessage",
        expect.objectContaining({
          issues: expect.any(Array),
        }),
      );
      expect(useCaseMock.execute).not.toHaveBeenCalled();
    });
  });

  describe("Success path", () => {
    test("should process valid message and execute use case", async () => {
      const progressIDs = ["progress-id-1", "progress-id-2"];
      vi.mocked(useCaseMock.execute).mockResolvedValueOnce(progressIDs);

      await handler(aValidMessage, context);

      expect(useCaseMock.execute).toHaveBeenCalledWith(
        aValidMessage.jobId,
        aValidMessage.title,
        aValidMessage.body,
        aValidMessage.scheduledTimestamp,
        aValidMessage.tags,
        telemetryServiceMock,
      );
      expect(telemetryServiceMock.trackEvent).not.toHaveBeenCalled();
    });

    test("should accept title at max length (500 chars)", async () => {
      const validMessage = {
        ...aValidMessage,
        title: "a".repeat(500),
      };
      const progressIDs = ["progress-id-1"];
      vi.mocked(useCaseMock.execute).mockResolvedValueOnce(progressIDs);

      await handler(validMessage, context);

      expect(useCaseMock.execute).toHaveBeenCalledWith(
        validMessage.jobId,
        validMessage.title,
        validMessage.body,
        validMessage.scheduledTimestamp,
        validMessage.tags,
        telemetryServiceMock,
      );
    });

    test("should accept body at max length (1000 chars)", async () => {
      const validMessage = {
        ...aValidMessage,
        body: "a".repeat(1000),
      };
      const progressIDs = ["progress-id-1"];
      vi.mocked(useCaseMock.execute).mockResolvedValueOnce(progressIDs);

      await handler(validMessage, context);

      expect(useCaseMock.execute).toHaveBeenCalledWith(
        validMessage.jobId,
        validMessage.title,
        validMessage.body,
        validMessage.scheduledTimestamp,
        validMessage.tags,
        telemetryServiceMock,
      );
    });

    test("should accept single tag", async () => {
      const validMessage = {
        ...aValidMessage,
        tags: ["single-tag"],
      };
      const progressIDs = ["progress-id-1"];
      vi.mocked(useCaseMock.execute).mockResolvedValueOnce(progressIDs);

      await handler(validMessage, context);

      expect(useCaseMock.execute).toHaveBeenCalledWith(
        validMessage.jobId,
        validMessage.title,
        validMessage.body,
        validMessage.scheduledTimestamp,
        validMessage.tags,
        telemetryServiceMock,
      );
    });
  });

  describe("Error handling", () => {
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
        aValidMessage.body,
        aValidMessage.scheduledTimestamp,
        aValidMessage.tags,
        telemetryServiceMock,
      );
      expect(telemetryServiceMock.trackEvent).toHaveBeenCalledWith(
        "massiveJobs.process",
        {
          cause: error.cause,
          message: error.message,
          name: error.name,
        },
      );
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
});
