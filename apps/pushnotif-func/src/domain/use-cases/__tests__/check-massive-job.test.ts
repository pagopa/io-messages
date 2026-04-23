import { afterEach, describe, expect, test, vi } from "vitest";

import {
  ErrorInternal,
  ErrorNotFound,
  ErrorTooManyRequests,
} from "../../error";
import {
  MassiveJob,
  MassiveJobsRepository,
  MassiveProgress,
  MassiveProgressRepository,
  MassiveProgressStatusEnum,
  massiveJobIDSchema,
} from "../../massive-jobs";
import {
  NotificationDetails,
  PushNotificationRepository,
} from "../../push-service";
import { TelemetryService } from "../../telemetry";
import { CheckMassiveJobStatusUseCase } from "../check-massive-job";

const jobId = massiveJobIDSchema.parse("01ARZ3NDEKTSV4RRFFQ69G5FAV");

const processingJob: MassiveJob = {
  executionTimeInHours: 2,
  id: jobId,
  message: "Notification body",
  startTimeTimestamp: 1700000000,
  status: "PROCESSING",
  title: "Notification title",
};

const pendingProgress: MassiveProgress = {
  id: "NH-20260414075828421-4f9593bd108846048ca51dc28f7e6b81-03",
  jobId,
  scheduledTimestamp: 1700000100,
  status: "PENDING",
  tags: ["aaa"],
};

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
  getMassiveNotificationDetail: vi.fn(),
};

const telemetryServiceMock: TelemetryService = {
  trackEvent: vi.fn(),
};

const useCase = new CheckMassiveJobStatusUseCase(
  massiveJobsRepositoryMock,
  massiveProgressRepositoryMock,
  pushNotificationRepositoryMock,
  telemetryServiceMock,
);

describe("CheckMassiveJobStatusUseCase status management", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  test("should return the current status when the job is not PROCESSING", async () => {
    const createdJob: MassiveJob = { ...processingJob, status: "CREATED" };
    vi.mocked(massiveJobsRepositoryMock.getMassiveJob).mockResolvedValueOnce(
      createdJob,
    );

    const result = await useCase.execute(jobId);

    expect(result).toBe("CREATED");
    expect(
      massiveProgressRepositoryMock.listMassiveJobPendingProgress,
    ).not.toHaveBeenCalled();
    expect(massiveJobsRepositoryMock.setStatus).not.toHaveBeenCalled();
  });

  test("should complete the job when there is no pending progress", async () => {
    vi.mocked(massiveJobsRepositoryMock.getMassiveJob).mockResolvedValueOnce(
      processingJob,
    );
    vi.mocked(
      massiveProgressRepositoryMock.listMassiveJobPendingProgress,
    ).mockResolvedValueOnce([]);
    vi.mocked(massiveJobsRepositoryMock.setStatus).mockResolvedValueOnce(
      "activity-id",
    );

    const result = await useCase.execute(jobId);

    expect(result).toBe("COMPLETED");
    expect(
      massiveProgressRepositoryMock.listMassiveJobPendingProgress,
    ).toHaveBeenCalledWith(jobId);
    expect(massiveJobsRepositoryMock.setStatus).toHaveBeenCalledWith(
      jobId,
      "COMPLETED",
    );
  });

  test("should mark the progress as FAILED and track telemetry when notification details are not found", async () => {
    const notFoundError = new ErrorNotFound(
      "Notification not found",
      "Missing outcome details",
    );
    vi.mocked(massiveJobsRepositoryMock.getMassiveJob).mockResolvedValueOnce(
      processingJob,
    );
    vi.mocked(
      massiveProgressRepositoryMock.listMassiveJobPendingProgress,
    ).mockResolvedValueOnce([pendingProgress]);
    vi.mocked(
      pushNotificationRepositoryMock.getMassiveNotificationDetail,
    ).mockResolvedValueOnce(notFoundError);
    vi.mocked(massiveProgressRepositoryMock.setStatus).mockResolvedValueOnce(
      "progress-updated",
    );
    vi.mocked(massiveJobsRepositoryMock.setStatus).mockResolvedValueOnce(
      "job-updated",
    );

    const result = await useCase.execute(jobId);

    expect(result).toBe("COMPLETED");
    expect(
      pushNotificationRepositoryMock.getMassiveNotificationDetail,
    ).toHaveBeenCalledWith(pendingProgress.id, pendingProgress.tags[0]);
    expect(massiveProgressRepositoryMock.setStatus).toHaveBeenCalledWith(
      pendingProgress.id,
      jobId,
      MassiveProgressStatusEnum.enum.FAILED,
    );
    expect(telemetryServiceMock.trackEvent).toHaveBeenCalledWith({
      name: "massiveJob.CheckMassiveJob.notification.notFound",
      properties: {
        errorCause: notFoundError.cause,
        errorKind: "ErrorNotFound",
        jobId,
        notificationId: pendingProgress.id,
        tag: pendingProgress.tags[0],
      },
    });
    expect(massiveJobsRepositoryMock.setStatus).toHaveBeenCalledWith(
      jobId,
      "COMPLETED",
    );
  });

  test("should return ErrorInternal when notification details request is throttled", async () => {
    const tooManyRequestsError = new ErrorTooManyRequests(
      "Too many requests",
      "retry later",
    );
    vi.mocked(massiveJobsRepositoryMock.getMassiveJob).mockResolvedValueOnce(
      processingJob,
    );
    vi.mocked(
      massiveProgressRepositoryMock.listMassiveJobPendingProgress,
    ).mockResolvedValueOnce([pendingProgress]);
    vi.mocked(
      pushNotificationRepositoryMock.getMassiveNotificationDetail,
    ).mockResolvedValueOnce(tooManyRequestsError);

    const result = await useCase.execute(jobId);

    expect(result).toBeInstanceOf(ErrorInternal);
    expect(result).toMatchObject({
      cause: tooManyRequestsError.cause,
      message: tooManyRequestsError.name,
    });
    expect(massiveProgressRepositoryMock.setStatus).not.toHaveBeenCalled();
    expect(massiveJobsRepositoryMock.setStatus).not.toHaveBeenCalled();
  });
});

describe("CheckMassiveJobStatusUseCase notification states", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  test("should return ErrorInternal when notification is still Processing", async () => {
    const notificationDetails: NotificationDetails = {
      notificationId: pendingProgress.id,
      state: "Processing",
    };
    vi.mocked(massiveJobsRepositoryMock.getMassiveJob).mockResolvedValueOnce(
      processingJob,
    );
    vi.mocked(
      massiveProgressRepositoryMock.listMassiveJobPendingProgress,
    ).mockResolvedValueOnce([pendingProgress]);
    vi.mocked(
      pushNotificationRepositoryMock.getMassiveNotificationDetail,
    ).mockResolvedValueOnce(notificationDetails);

    const result = await useCase.execute(jobId);

    expect(result).toBeInstanceOf(ErrorInternal);
    expect(result).toMatchObject({
      message: `Notification with id ${pendingProgress.id} still in state Processing`,
    });
    expect(massiveProgressRepositoryMock.setStatus).not.toHaveBeenCalled();
    expect(massiveJobsRepositoryMock.setStatus).not.toHaveBeenCalled();
  });

  test("should mark the progress as FAILED when notification state is Abandoned", async () => {
    const notificationDetails: NotificationDetails = {
      notificationId: pendingProgress.id,
      state: "Abandoned",
    };
    vi.mocked(massiveJobsRepositoryMock.getMassiveJob).mockResolvedValueOnce(
      processingJob,
    );
    vi.mocked(
      massiveProgressRepositoryMock.listMassiveJobPendingProgress,
    ).mockResolvedValueOnce([pendingProgress]);
    vi.mocked(
      pushNotificationRepositoryMock.getMassiveNotificationDetail,
    ).mockResolvedValueOnce(notificationDetails);
    vi.mocked(massiveProgressRepositoryMock.setStatus).mockResolvedValueOnce(
      "progress-updated",
    );
    vi.mocked(massiveJobsRepositoryMock.setStatus).mockResolvedValueOnce(
      "job-updated",
    );

    const result = await useCase.execute(jobId);

    expect(result).toBe("COMPLETED");
    expect(massiveProgressRepositoryMock.setStatus).toHaveBeenCalledWith(
      pendingProgress.id,
      jobId,
      MassiveProgressStatusEnum.enum.FAILED,
    );
    expect(massiveJobsRepositoryMock.setStatus).toHaveBeenCalledWith(
      jobId,
      "COMPLETED",
    );
  });

  test("should mark the progress as SENT when notification state is Completed", async () => {
    const notificationDetails: NotificationDetails = {
      notificationId: pendingProgress.id,
      state: "Completed",
    };
    vi.mocked(massiveJobsRepositoryMock.getMassiveJob).mockResolvedValueOnce(
      processingJob,
    );
    vi.mocked(
      massiveProgressRepositoryMock.listMassiveJobPendingProgress,
    ).mockResolvedValueOnce([pendingProgress]);
    vi.mocked(
      pushNotificationRepositoryMock.getMassiveNotificationDetail,
    ).mockResolvedValueOnce(notificationDetails);
    vi.mocked(massiveProgressRepositoryMock.setStatus).mockResolvedValueOnce(
      "progress-updated",
    );
    vi.mocked(massiveJobsRepositoryMock.setStatus).mockResolvedValueOnce(
      "job-updated",
    );

    const result = await useCase.execute(jobId);

    expect(result).toBe("COMPLETED");
    expect(massiveProgressRepositoryMock.setStatus).toHaveBeenCalledWith(
      pendingProgress.id,
      jobId,
      MassiveProgressStatusEnum.enum.SENT,
    );
    expect(massiveJobsRepositoryMock.setStatus).toHaveBeenCalledWith(
      jobId,
      "COMPLETED",
    );
  });
});

describe("CheckMassiveJobStatusUseCase error propagation", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  test("should propagate ErrorInternal from pending progress repository", async () => {
    const internalError = new ErrorInternal("Progress query failed");
    vi.mocked(massiveJobsRepositoryMock.getMassiveJob).mockResolvedValueOnce(
      processingJob,
    );
    vi.mocked(
      massiveProgressRepositoryMock.listMassiveJobPendingProgress,
    ).mockResolvedValueOnce(internalError);

    const result = await useCase.execute(jobId);

    expect(result).toBe(internalError);
    expect(
      pushNotificationRepositoryMock.getMassiveNotificationDetail,
    ).not.toHaveBeenCalled();
  });
});
