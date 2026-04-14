import { afterEach, describe, expect, test, vi } from "vitest";

import { ErrorConflict, ErrorInternal, ErrorNotFound } from "../../error";
import {
  MassiveJob,
  MassiveJobsRepository,
  MassiveProgress,
  MassiveProgressRepository,
  massiveJobIDSchema,
} from "../../massive-jobs";
import { PushNotificationRepository } from "../../push-service";
import { CancelMassiveNotificationJobUseCase } from "../cancel-massive-notification-job";

const jobId = massiveJobIDSchema.parse("01ARZ3NDEKTSV4RRFFQ69G5FAV");

const baseJob: Omit<MassiveJob, "status"> = {
  body: "Notification body",
  executionTimeInHours: 2,
  id: jobId,
  startTimeTimestamp: 1700000000,
  title: "Notification title",
};

const pendingProgress: MassiveProgress[] = [
  {
    id: "550e8400-e29b-41d4-a716-446655440000",
    jobId,
    scheduledTimestamp: 1700000100,
    status: "PENDING",
    tags: ["aaa"],
  },
  {
    id: "660e8400-e29b-41d4-a716-446655440001",
    jobId,
    scheduledTimestamp: 1700000200,
    status: "PENDING",
    tags: ["bbb"],
  },
];

const massiveJobsRepositoryMock: MassiveJobsRepository = {
  createMassiveJob: vi.fn(),
  getMassiveJob: vi.fn(),
  setStatus: vi.fn(),
  updateMassiveJob: vi.fn(),
};

const massiveProgressRepositoryMock: MassiveProgressRepository = {
  listMassiveJobPendingProgress: vi.fn(),
  listMassiveJobProgress: vi.fn(),
  setStatus: vi.fn(),
};

const pushNotificationRepositoryMock: PushNotificationRepository = {
  cancelScheduledNotification: vi.fn(),
  getMassiveNotificationDetail: vi.fn(),
};

const useCase = new CancelMassiveNotificationJobUseCase(
  massiveJobsRepositoryMock,
  massiveProgressRepositoryMock,
  pushNotificationRepositoryMock,
);

describe("CancelMassiveNotificationJobUseCase", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  test("should return ErrorNotFound when job is not found", async () => {
    const notFoundError = new ErrorNotFound("Massive job not found");
    vi.mocked(massiveJobsRepositoryMock.getMassiveJob).mockResolvedValueOnce(
      notFoundError,
    );

    const result = await useCase.execute(jobId);

    expect(result).toBe(notFoundError);
  });

  test("should return ErrorInternal when getMassiveJob fails", async () => {
    const internalError = new ErrorInternal("Cosmos error");
    vi.mocked(massiveJobsRepositoryMock.getMassiveJob).mockResolvedValueOnce(
      internalError,
    );

    const result = await useCase.execute(jobId);

    expect(result).toBe(internalError);
  });

  test.each(["CREATED", "CANCELED", "COMPLETED", "FAILED"] as const)(
    "should return ErrorConflict when job status is %s",
    async (status) => {
      vi.mocked(massiveJobsRepositoryMock.getMassiveJob).mockResolvedValueOnce({
        ...baseJob,
        status,
      });

      const result = await useCase.execute(jobId);

      expect(result).toBeInstanceOf(ErrorConflict);
      expect((result as ErrorConflict).message).toBe(
        `Jobs with status '${status}' cannot be canceled`,
      );
    },
  );

  test("should stop job with no pending progress", async () => {
    vi.mocked(massiveJobsRepositoryMock.getMassiveJob).mockResolvedValueOnce({
      ...baseJob,
      status: "PROCESSING",
    });
    vi.mocked(
      massiveProgressRepositoryMock.listMassiveJobPendingProgress,
    ).mockResolvedValueOnce([]);
    vi.mocked(massiveJobsRepositoryMock.setStatus).mockResolvedValueOnce(
      "activity-id",
    );

    const result = await useCase.execute(jobId);

    expect(result).toEqual({ jobId, status: "CANCELED" });
    expect(massiveJobsRepositoryMock.setStatus).toHaveBeenCalledWith(
      jobId,
      "CANCELED",
    );
    expect(
      pushNotificationRepositoryMock.cancelScheduledNotification,
    ).not.toHaveBeenCalled();
  });

  test("should cancel all pending notifications and stop job", async () => {
    vi.mocked(massiveJobsRepositoryMock.getMassiveJob).mockResolvedValueOnce({
      ...baseJob,
      status: "PROCESSING",
    });
    vi.mocked(
      massiveProgressRepositoryMock.listMassiveJobPendingProgress,
    ).mockResolvedValueOnce(pendingProgress);
    vi.mocked(
      pushNotificationRepositoryMock.cancelScheduledNotification,
    ).mockResolvedValue("notification-id");
    vi.mocked(massiveProgressRepositoryMock.setStatus).mockResolvedValue(
      "activity-id",
    );
    vi.mocked(massiveJobsRepositoryMock.setStatus).mockResolvedValueOnce(
      "activity-id",
    );

    const result = await useCase.execute(jobId);

    expect(result).toEqual({ jobId, status: "CANCELED" });
    expect(
      pushNotificationRepositoryMock.cancelScheduledNotification,
    ).toHaveBeenCalledTimes(2);
    expect(
      pushNotificationRepositoryMock.cancelScheduledNotification,
    ).toHaveBeenCalledWith(pendingProgress[0].id, "aaa");
    expect(
      pushNotificationRepositoryMock.cancelScheduledNotification,
    ).toHaveBeenCalledWith(pendingProgress[1].id, "bbb");
    expect(massiveProgressRepositoryMock.setStatus).toHaveBeenCalledTimes(2);
    expect(massiveProgressRepositoryMock.setStatus).toHaveBeenCalledWith(
      pendingProgress[0].id,
      jobId,
      "CANCELED",
    );
    expect(massiveProgressRepositoryMock.setStatus).toHaveBeenCalledWith(
      pendingProgress[1].id,
      jobId,
      "CANCELED",
    );
    expect(massiveJobsRepositoryMock.setStatus).toHaveBeenCalledWith(
      jobId,
      "CANCELED",
    );
  });

  test("should return ErrorInternal when listMassiveJobPendingProgress fails", async () => {
    vi.mocked(massiveJobsRepositoryMock.getMassiveJob).mockResolvedValueOnce({
      ...baseJob,
      status: "PROCESSING",
    });
    const internalError = new ErrorInternal("Progress query failed");
    vi.mocked(
      massiveProgressRepositoryMock.listMassiveJobPendingProgress,
    ).mockResolvedValueOnce(internalError);

    const result = await useCase.execute(jobId);

    expect(result).toBe(internalError);
  });

  test("should fail fast when cancelScheduledNotification fails", async () => {
    vi.mocked(massiveJobsRepositoryMock.getMassiveJob).mockResolvedValueOnce({
      ...baseJob,
      status: "PROCESSING",
    });
    vi.mocked(
      massiveProgressRepositoryMock.listMassiveJobPendingProgress,
    ).mockResolvedValueOnce(pendingProgress);
    const nhError = new ErrorInternal("NH cancel failed");
    vi.mocked(
      pushNotificationRepositoryMock.cancelScheduledNotification,
    ).mockResolvedValueOnce(nhError);

    const result = await useCase.execute(jobId);

    expect(result).toBe(nhError);
    expect(
      pushNotificationRepositoryMock.cancelScheduledNotification,
    ).toHaveBeenCalledTimes(1);
    expect(massiveProgressRepositoryMock.setStatus).not.toHaveBeenCalled();
    expect(massiveJobsRepositoryMock.setStatus).not.toHaveBeenCalled();
  });

  test("should fail fast when progress setStatus fails", async () => {
    vi.mocked(massiveJobsRepositoryMock.getMassiveJob).mockResolvedValueOnce({
      ...baseJob,
      status: "PROCESSING",
    });
    vi.mocked(
      massiveProgressRepositoryMock.listMassiveJobPendingProgress,
    ).mockResolvedValueOnce(pendingProgress);
    vi.mocked(
      pushNotificationRepositoryMock.cancelScheduledNotification,
    ).mockResolvedValueOnce("notification-id");
    const setStatusError = new ErrorInternal("Cosmos patch failed");
    vi.mocked(massiveProgressRepositoryMock.setStatus).mockResolvedValueOnce(
      setStatusError,
    );

    const result = await useCase.execute(jobId);

    expect(result).toBe(setStatusError);
    expect(massiveJobsRepositoryMock.setStatus).not.toHaveBeenCalled();
  });

  test("should return ErrorInternal when setJobStatus fails", async () => {
    vi.mocked(massiveJobsRepositoryMock.getMassiveJob).mockResolvedValueOnce({
      ...baseJob,
      status: "PROCESSING",
    });
    vi.mocked(
      massiveProgressRepositoryMock.listMassiveJobPendingProgress,
    ).mockResolvedValueOnce([]);
    const setStatusError = new ErrorInternal("Cosmos patch failed");
    vi.mocked(massiveJobsRepositoryMock.setStatus).mockResolvedValueOnce(
      setStatusError,
    );

    const result = await useCase.execute(jobId);

    expect(result).toBe(setStatusError);
  });
});
