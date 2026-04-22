import { afterEach, describe, expect, test, vi } from "vitest";

import { ErrorInternal } from "../../error";
import {
  MassiveProgressRepository,
  MassiveProgressStatusEnum,
  massiveJobIDSchema,
} from "../../massive-jobs";
import { PushNotificationRepository } from "../../push-service";
import { TelemetryService } from "../../telemetry";
import { ProcessMassiveJobUseCase } from "../process-massive-job";

const jobId = massiveJobIDSchema.parse("01ARZ3NDEKTSV4RRFFQ69G5FAV");
const title = "Test notification title";
const message = "Test notification message";
const scheduledTimestamp = 1700000100;
const tags = ["aaa", "bbb", "ccc"];

const massiveProgressRepositoryMock: MassiveProgressRepository = {
  create: vi.fn(),
  listMassiveJobPendingProgress: vi.fn(),
  listMassiveJobProgress: vi.fn(),
  setStatus: vi.fn(),
};

const pushNotificationRepositoryMock: PushNotificationRepository = {
  getMassiveNotificationDetail: vi.fn(),
  scheduleMassiveNotification: vi.fn(),
};

const telemetryServiceMock: TelemetryService = {
  trackEvent: vi.fn(),
};

const useCase = new ProcessMassiveJobUseCase(
  massiveProgressRepositoryMock,
  pushNotificationRepositoryMock,
);

const afterEachCleanup = () => {
  vi.clearAllMocks();
};

// eslint-disable-next-line max-lines-per-function
describe("ProcessMassiveJobUseCase", () => {
  afterEach(afterEachCleanup);

  describe("Happy path", () => {
    test("should schedule notifications and create progress records successfully with single partition", async () => {
      const notificationID = "nh-notification-id-123";
      vi.mocked(
        pushNotificationRepositoryMock.scheduleMassiveNotification,
      ).mockResolvedValueOnce([
        {
          notificationID,
          tags,
        },
      ]);

      vi.mocked(massiveProgressRepositoryMock.create).mockResolvedValueOnce(
        notificationID,
      );

      const result = await useCase.execute(
        jobId,
        title,
        message,
        scheduledTimestamp,
        tags,
        telemetryServiceMock,
      );

      expect(result).toEqual([notificationID]);
      expect(
        pushNotificationRepositoryMock.scheduleMassiveNotification,
      ).toHaveBeenCalledWith(title, message, scheduledTimestamp, tags);
      expect(massiveProgressRepositoryMock.create).toHaveBeenCalledTimes(1);
      expect(massiveProgressRepositoryMock.create).toHaveBeenCalledWith({
        id: notificationID,
        jobId,
        scheduledTimestamp,
        status: MassiveProgressStatusEnum.enum.PENDING,
        tags,
      });
    });

    test("should handle multiple tags across different partitions", async () => {
      const notificationID1 = "nh-notification-id-partition-1";
      const notificationID2 = "nh-notification-id-partition-2";
      const tagsPartition1 = ["aaa", "bbb"];
      const tagsPartition2 = ["ccc"];

      vi.mocked(
        pushNotificationRepositoryMock.scheduleMassiveNotification,
      ).mockResolvedValueOnce([
        {
          notificationID: notificationID1,
          tags: tagsPartition1,
        },
        {
          notificationID: notificationID2,
          tags: tagsPartition2,
        },
      ]);

      vi.mocked(massiveProgressRepositoryMock.create)
        .mockResolvedValueOnce(notificationID1)
        .mockResolvedValueOnce(notificationID2);

      const result = await useCase.execute(
        jobId,
        title,
        message,
        scheduledTimestamp,
        tags,
        telemetryServiceMock,
      );

      expect(result).toEqual([notificationID1, notificationID2]);
      expect(massiveProgressRepositoryMock.create).toHaveBeenCalledTimes(2);
      expect(massiveProgressRepositoryMock.create).toHaveBeenNthCalledWith(1, {
        id: notificationID1,
        jobId,
        scheduledTimestamp,
        status: MassiveProgressStatusEnum.enum.PENDING,
        tags: tagsPartition1,
      });
      expect(massiveProgressRepositoryMock.create).toHaveBeenNthCalledWith(2, {
        id: notificationID2,
        jobId,
        scheduledTimestamp,
        status: MassiveProgressStatusEnum.enum.PENDING,
        tags: tagsPartition2,
      });
    });
  });

  describe("Error scenarios", () => {
    describe("scheduleMassiveNotification failures", () => {
      test("should return ErrorInternal when scheduleMassiveNotification fails", async () => {
        const error = new ErrorInternal(
          "Failed to schedule notification",
          "Rest error",
        );
        vi.mocked(
          pushNotificationRepositoryMock.scheduleMassiveNotification,
        ).mockResolvedValueOnce(error);

        const result = await useCase.execute(
          jobId,
          title,
          message,
          scheduledTimestamp,
          tags,
          telemetryServiceMock,
        );

        expect(result).toBe(error);
        expect(massiveProgressRepositoryMock.create).not.toHaveBeenCalled();
      });
    });

    describe("progress creation failures", () => {
      test("should track event and continue when create() fails for one progress record", async () => {
        const notificationID1 = "nh-notification-id-1";
        const notificationID2 = "nh-notification-id-2";
        const tagsPartition1 = ["aaa"];
        const tagsPartition2 = ["bbb"];

        vi.mocked(
          pushNotificationRepositoryMock.scheduleMassiveNotification,
        ).mockResolvedValueOnce([
          {
            notificationID: notificationID1,
            tags: tagsPartition1,
          },
          {
            notificationID: notificationID2,
            tags: tagsPartition2,
          },
        ]);

        const createError = new ErrorInternal(
          "Failed to create progress",
          "Cosmos error",
        );
        vi.mocked(massiveProgressRepositoryMock.create)
          .mockResolvedValueOnce(createError)
          .mockResolvedValueOnce(notificationID2);

        const result = await useCase.execute(
          jobId,
          title,
          message,
          scheduledTimestamp,
          tags,
          telemetryServiceMock,
        );

        // Should return all IDs even if creation failed (notification was scheduled)
        expect(result).toEqual([notificationID1, notificationID2]);
        expect(massiveProgressRepositoryMock.create).toHaveBeenCalledTimes(2);
        expect(telemetryServiceMock.trackEvent).toHaveBeenCalledWith({
          name: "massiveJob.ProcessMassiveJob.progress.create.failed",
          properties: {
            errorCause: createError.cause,
            errorKind: "ErrorInternal",
            jobId,
            notificationId: notificationID1,
            scheduledTimestamp,
            tags: ["aaa"],
          },
        });
      });

      test("should track event for each failed progress creation", async () => {
        const notificationID1 = "nh-notification-id-1";
        const notificationID2 = "nh-notification-id-2";

        vi.mocked(
          pushNotificationRepositoryMock.scheduleMassiveNotification,
        ).mockResolvedValueOnce([
          {
            notificationID: notificationID1,
            tags: ["aaa"],
          },
          {
            notificationID: notificationID2,
            tags: ["bbb"],
          },
        ]);

        const createError1 = new ErrorInternal(
          "Failed to create progress 1",
          "Cosmos error",
        );
        const createError2 = new ErrorInternal(
          "Failed to create progress 2",
          "Cosmos error",
        );
        vi.mocked(massiveProgressRepositoryMock.create)
          .mockResolvedValueOnce(createError1)
          .mockResolvedValueOnce(createError2);

        const result = await useCase.execute(
          jobId,
          title,
          message,
          scheduledTimestamp,
          tags,
          telemetryServiceMock,
        );

        expect(result).toEqual([notificationID1, notificationID2]);
        expect(telemetryServiceMock.trackEvent).toHaveBeenCalledTimes(2);
        expect(telemetryServiceMock.trackEvent).toHaveBeenNthCalledWith(1, {
          name: "massiveJob.ProcessMassiveJob.progress.create.failed",
          properties: {
            errorCause: createError1.cause,
            errorKind: "ErrorInternal",
            jobId,
            notificationId: notificationID1,
            scheduledTimestamp,
            tags: ["aaa"],
          },
        });
        expect(telemetryServiceMock.trackEvent).toHaveBeenNthCalledWith(2, {
          name: "massiveJob.ProcessMassiveJob.progress.create.failed",
          properties: {
            errorCause: createError2.cause,
            errorKind: "ErrorInternal",
            jobId,
            notificationId: notificationID2,
            scheduledTimestamp,
            tags: ["bbb"],
          },
        });
      });
    });
  });

  describe("Edge cases", () => {
    test("should handle single tag input (minimum valid)", async () => {
      const singleTag = ["aaa"];
      const notificationID = "nh-notification-id-single";
      vi.mocked(
        pushNotificationRepositoryMock.scheduleMassiveNotification,
      ).mockResolvedValueOnce([
        {
          notificationID,
          tags: singleTag,
        },
      ]);

      vi.mocked(massiveProgressRepositoryMock.create).mockResolvedValueOnce(
        notificationID,
      );

      const result = await useCase.execute(
        jobId,
        title,
        message,
        scheduledTimestamp,
        singleTag,
        telemetryServiceMock,
      );

      expect(result).toEqual([notificationID]);
      expect(
        pushNotificationRepositoryMock.scheduleMassiveNotification,
      ).toHaveBeenCalledWith(title, message, scheduledTimestamp, singleTag);
    });

    test("should handle many tags resulting in many progress records", async () => {
      const manyNotifications = Array.from({ length: 10 }, (_, i) => ({
        notificationID: `nh-notification-id-${i}`,
        tags: [`tag-${i}`],
      }));

      vi.mocked(
        pushNotificationRepositoryMock.scheduleMassiveNotification,
      ).mockResolvedValueOnce(manyNotifications);

      manyNotifications.forEach((notification) => {
        vi.mocked(massiveProgressRepositoryMock.create).mockResolvedValueOnce(
          notification.notificationID,
        );
      });

      const result = await useCase.execute(
        jobId,
        title,
        message,
        scheduledTimestamp,
        tags,
        telemetryServiceMock,
      );

      expect(result).toEqual(manyNotifications.map((n) => n.notificationID));
      expect(massiveProgressRepositoryMock.create).toHaveBeenCalledTimes(10);
    });

    test("should return all notification IDs even when all progress creations fail", async () => {
      const notificationID1 = "nh-notification-id-1";
      const notificationID2 = "nh-notification-id-2";

      vi.mocked(
        pushNotificationRepositoryMock.scheduleMassiveNotification,
      ).mockResolvedValueOnce([
        {
          notificationID: notificationID1,
          tags: ["aaa"],
        },
        {
          notificationID: notificationID2,
          tags: ["bbb"],
        },
      ]);

      const createError = new ErrorInternal(
        "Failed to create progress",
        "Cosmos error",
      );
      vi.mocked(massiveProgressRepositoryMock.create)
        .mockResolvedValueOnce(createError)
        .mockResolvedValueOnce(createError);

      const result = await useCase.execute(
        jobId,
        title,
        message,
        scheduledTimestamp,
        tags,
        telemetryServiceMock,
      );

      // Should still return all IDs since notifications were scheduled
      expect(result).toEqual([notificationID1, notificationID2]);
      expect(telemetryServiceMock.trackEvent).toHaveBeenCalledTimes(2);
    });

    test("should not call telemetryService when all creations succeed", async () => {
      const notificationID = "nh-notification-id-123";
      vi.mocked(
        pushNotificationRepositoryMock.scheduleMassiveNotification,
      ).mockResolvedValueOnce([
        {
          notificationID,
          tags,
        },
      ]);

      vi.mocked(massiveProgressRepositoryMock.create).mockResolvedValueOnce(
        notificationID,
      );

      await useCase.execute(
        jobId,
        title,
        message,
        scheduledTimestamp,
        tags,
        telemetryServiceMock,
      );

      expect(telemetryServiceMock.trackEvent).not.toHaveBeenCalled();
    });
  });
});
