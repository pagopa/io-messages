import { afterEach, describe, expect, test, vi } from "vitest";

import { ErrorInternal, ErrorNotFound } from "../../error";
import {
  MassiveJob,
  MassiveJobsRepository,
  MassiveProgress,
  MassiveProgressRepository,
  massiveJobIDSchema,
} from "../../massive-jobs";
import { GetMassiveNotificationJobUseCase } from "../get-massive-notification-job";

const jobId = massiveJobIDSchema.parse("01ARZ3NDEKTSV4RRFFQ69G5FAV");

const baseJob: Omit<MassiveJob, "status"> = {
  body: "Notification body",
  executionTimeInHours: 2,
  id: jobId,
  startTimeTimestamp: 1700000000,
  title: "Notification title",
};

const progress: MassiveProgress[] = [
  {
    status: "PENDING",
    id: "550e8400-e29b-41d4-a716-446655440000",
    jobId,
    scheduledTimestamp: 1700000100,
    tags: ["aaa"],
  },
];

const massiveJobsRepositoryMock: MassiveJobsRepository = {
  createMassiveJob: vi.fn(),
  getMassiveJob: vi.fn(),
  updateMassiveJob: vi.fn(),
};

const massiveProgressRepositoryMock: MassiveProgressRepository = {
  listMassiveJobProgress: vi.fn(),
};

const useCase = new GetMassiveNotificationJobUseCase(
  massiveJobsRepositoryMock,
  massiveProgressRepositoryMock,
);

describe("GetMassiveNotificationJobUseCase", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  test("should return job with progress when status is PROCESSING", async () => {
    vi.mocked(massiveJobsRepositoryMock.getMassiveJob).mockResolvedValueOnce({
      ...baseJob,
      status: "PROCESSING",
    });
    vi.mocked(
      massiveProgressRepositoryMock.listMassiveJobProgress,
    ).mockResolvedValueOnce(progress);

    const result = await useCase.execute(jobId);

    expect(result).toEqual({
      ...baseJob,
      progress,
      status: "PROCESSING",
    });
    expect(
      massiveProgressRepositoryMock.listMassiveJobProgress,
    ).toHaveBeenCalledWith(jobId);
  });

  test("should return job without progress when status is CREATED", async () => {
    const createdJob: MassiveJob = { ...baseJob, status: "CREATED" };
    vi.mocked(massiveJobsRepositoryMock.getMassiveJob).mockResolvedValueOnce(
      createdJob,
    );

    const result = await useCase.execute(jobId);

    expect(result).toEqual(createdJob);
    expect(
      massiveProgressRepositoryMock.listMassiveJobProgress,
    ).not.toHaveBeenCalled();
  });

  test("should return job with progress when status is COMPLETED", async () => {
    const completedJob: MassiveJob = {
      ...baseJob,
      status: "COMPLETED",
    };
    vi.mocked(massiveJobsRepositoryMock.getMassiveJob).mockResolvedValueOnce(
      completedJob,
    );
    vi.mocked(
      massiveProgressRepositoryMock.listMassiveJobProgress,
    ).mockResolvedValueOnce(progress);

    const result = await useCase.execute(jobId);

    expect(result).toEqual({ ...completedJob, progress });
    expect(
      massiveProgressRepositoryMock.listMassiveJobProgress,
    ).toHaveBeenCalledWith(jobId);
  });

  test("should propagate ErrorNotFound from massive job repository", async () => {
    const notFoundError = new ErrorNotFound("Massive job not found");
    vi.mocked(massiveJobsRepositoryMock.getMassiveJob).mockResolvedValueOnce(
      notFoundError,
    );

    const result = await useCase.execute(jobId);

    expect(result).toBe(notFoundError);
  });

  test("should propagate ErrorInternal from progress repository", async () => {
    vi.mocked(massiveJobsRepositoryMock.getMassiveJob).mockResolvedValueOnce({
      ...baseJob,
      status: "FAILED",
    });

    const internalError = new ErrorInternal("Progress query failed");
    vi.mocked(
      massiveProgressRepositoryMock.listMassiveJobProgress,
    ).mockResolvedValueOnce(internalError);

    const result = await useCase.execute(jobId);

    expect(result).toBe(internalError);
  });
});
