import { afterEach, describe, expect, test, vi } from "vitest";

import { CheckJobMessageRepository } from "../../check-job-message";
import { ErrorInternal, ErrorNotFound, ErrorValidation } from "../../error";
import {
  MassiveJob,
  MassiveJobStatusEnum,
  MassiveJobsRepository,
  massiveJobIDSchema,
} from "../../massive-jobs";
import { SendNotificationMessageRepository } from "../../send-notification";
import { TelemetryService } from "../../telemetry";
import { MakeStartMassiveNotificationJobUseCase } from "../start-massive-notification-job";

const jobId = massiveJobIDSchema.parse("01ARZ3NDEKTSV4RRFFQ69G5FAV");
const fixedNowTimestamp = 1_700_000_000;
const fixedNowMilliseconds = fixedNowTimestamp * 1000;
const requestedStartTimeTimestamp = fixedNowTimestamp + 3600;

const baseJob: MassiveJob = {
  body: "Notification body",
  executionTimeInHours: 2,
  id: jobId,
  status: MassiveJobStatusEnum.enum.CREATED,
  title: "Notification title",
};

const repositoryMock: MassiveJobsRepository = {
  createMassiveJob: vi.fn(),
  getMassiveJob: vi.fn(),
  updateMassiveJob: vi.fn(),
};

const checkJobMessageQueueMock: CheckJobMessageRepository = {
  sendMessage: vi.fn(),
};

const sendNotificationMessageRepositoryMock: SendNotificationMessageRepository =
  {
    sendMessage: vi.fn(),
  };

const telemetryClientMock: TelemetryService = {
  trackEvent: vi.fn(),
  trackException: vi.fn(),
};

const createUseCase = () =>
  new MakeStartMassiveNotificationJobUseCase(
    repositoryMock,
    sendNotificationMessageRepositoryMock,
    checkJobMessageQueueMock,
    telemetryClientMock,
  );

describe("StartMassiveNotificationJobUseCase", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  test("should propagate repository lookup errors", async () => {
    const useCase = createUseCase();
    const repositoryError = new ErrorInternal("Repository error");
    vi.mocked(repositoryMock.getMassiveJob).mockResolvedValueOnce(
      repositoryError,
    );

    const result = await useCase.execute(jobId, requestedStartTimeTimestamp);

    expect(result).toBe(repositoryError);
    expect(checkJobMessageQueueMock.sendMessage).not.toHaveBeenCalled();
    expect(repositoryMock.updateMassiveJob).not.toHaveBeenCalled();
    expect(
      sendNotificationMessageRepositoryMock.sendMessage,
    ).not.toHaveBeenCalled();
  });

  test("should return an internal error when the job is not in CREATED status", async () => {
    const useCase = createUseCase();
    vi.mocked(repositoryMock.getMassiveJob).mockResolvedValueOnce({
      ...baseJob,
      status: MassiveJobStatusEnum.enum.PROCESSING,
    });

    const result = await useCase.execute(jobId, requestedStartTimeTimestamp);

    expect(result).toBeInstanceOf(ErrorValidation);
    expect(result).toMatchObject({
      message: `Cannot start massive job with id ${jobId} because it is in PROCESSING status`,
    });
    expect(checkJobMessageQueueMock.sendMessage).not.toHaveBeenCalled();
    expect(repositoryMock.updateMassiveJob).not.toHaveBeenCalled();
    expect(
      sendNotificationMessageRepositoryMock.sendMessage,
    ).not.toHaveBeenCalled();
  });

  test("should propagate check-job queue failures before updating the job", async () => {
    const useCase = createUseCase();
    vi.spyOn(Date, "now").mockReturnValue(fixedNowMilliseconds);
    vi.mocked(repositoryMock.getMassiveJob).mockResolvedValueOnce(baseJob);

    const queueError = new ErrorInternal("Check queue error");
    vi.mocked(checkJobMessageQueueMock.sendMessage).mockResolvedValueOnce(
      queueError,
    );

    const result = await useCase.execute(jobId, requestedStartTimeTimestamp);

    expect(result).toBe(queueError);
    expect(checkJobMessageQueueMock.sendMessage).toHaveBeenCalledWith({
      jobId,
      visibilityTimeoutInSeconds: 11100,
    });
    expect(repositoryMock.updateMassiveJob).not.toHaveBeenCalled();
    expect(
      sendNotificationMessageRepositoryMock.sendMessage,
    ).not.toHaveBeenCalled();
  });

  test("should propagate update failures after scheduling the status check message", async () => {
    const useCase = createUseCase();
    vi.spyOn(Date, "now").mockReturnValue(fixedNowMilliseconds);
    vi.mocked(repositoryMock.getMassiveJob).mockResolvedValueOnce(baseJob);
    vi.mocked(checkJobMessageQueueMock.sendMessage).mockResolvedValueOnce(
      "check-message-id",
    );

    const updateError = new ErrorNotFound("Massive job not found");
    vi.mocked(repositoryMock.updateMassiveJob).mockResolvedValueOnce(
      updateError,
    );

    const result = await useCase.execute(jobId, requestedStartTimeTimestamp);

    expect(result).toBe(updateError);
    expect(repositoryMock.updateMassiveJob).toHaveBeenCalledWith({
      ...baseJob,
      startTimeTimestamp: requestedStartTimeTimestamp,
      status: MassiveJobStatusEnum.enum.PROCESSING,
    });
    expect(
      sendNotificationMessageRepositoryMock.sendMessage,
    ).not.toHaveBeenCalled();
  });

  test("should schedule all notification batches and return job id and status on success", async () => {
    const useCase = createUseCase();
    vi.spyOn(Date, "now").mockReturnValue(fixedNowMilliseconds);
    vi.mocked(repositoryMock.getMassiveJob).mockResolvedValueOnce(baseJob);
    vi.mocked(checkJobMessageQueueMock.sendMessage).mockResolvedValueOnce(
      "check-message-id",
    );
    vi.mocked(repositoryMock.updateMassiveJob).mockResolvedValueOnce(jobId);
    vi.mocked(
      sendNotificationMessageRepositoryMock.sendMessage,
    ).mockResolvedValue("send-message-id");

    const result = await useCase.execute(jobId, requestedStartTimeTimestamp);

    expect(result).toEqual({
      id: jobId,
      status: MassiveJobStatusEnum.enum.PROCESSING,
    });
    expect(checkJobMessageQueueMock.sendMessage).toHaveBeenCalledWith({
      jobId,
      visibilityTimeoutInSeconds: 11100,
    });
    expect(repositoryMock.updateMassiveJob).toHaveBeenCalledWith({
      ...baseJob,
      startTimeTimestamp: requestedStartTimeTimestamp,
      status: MassiveJobStatusEnum.enum.PROCESSING,
    });
    expect(
      sendNotificationMessageRepositoryMock.sendMessage,
    ).toHaveBeenCalledTimes(410);

    const firstBatchMessage = vi.mocked(
      sendNotificationMessageRepositoryMock.sendMessage,
    ).mock.calls[0][0];
    const lastBatchMessage = vi
      .mocked(sendNotificationMessageRepositoryMock.sendMessage)
      .mock.calls.at(-1)?.[0];

    expect(firstBatchMessage).toEqual(
      expect.objectContaining({
        body: baseJob.body,
        jobId,
        scheduledTimestamp: 1700000017,
        tags: [
          "000",
          "001",
          "002",
          "003",
          "004",
          "005",
          "006",
          "007",
          "008",
          "009",
        ],
        title: baseJob.title,
      }),
    );
    expect(lastBatchMessage).toEqual(
      expect.objectContaining({
        jobId,
        scheduledTimestamp: 1700007207,
        tags: ["ffa", "ffb", "ffc", "ffd", "ffe", "fff"],
      }),
    );
    expect(telemetryClientMock.trackEvent).not.toHaveBeenCalled();
    expect(telemetryClientMock.trackException).not.toHaveBeenCalled();
  });
});

describe("StartMassiveNotificationJobUseCase - telemetry", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  test("should track telemetry event when scheduling a notification batch fails", async () => {
    const useCase = createUseCase();
    vi.spyOn(Date, "now").mockReturnValue(fixedNowMilliseconds);
    vi.mocked(repositoryMock.getMassiveJob).mockResolvedValueOnce(baseJob);
    vi.mocked(checkJobMessageQueueMock.sendMessage).mockResolvedValueOnce(
      "check-message-id",
    );
    vi.mocked(repositoryMock.updateMassiveJob).mockResolvedValueOnce(jobId);
    const sendError = new ErrorInternal("queue output failure");
    vi.mocked(sendNotificationMessageRepositoryMock.sendMessage)
      .mockResolvedValueOnce(sendError)
      .mockResolvedValue("send-message-id");

    const result = await useCase.execute(jobId, requestedStartTimeTimestamp);

    expect(result).toEqual({
      id: jobId,
      status: MassiveJobStatusEnum.enum.PROCESSING,
    });
    expect(
      sendNotificationMessageRepositoryMock.sendMessage,
    ).toHaveBeenCalledTimes(410);
    expect(telemetryClientMock.trackEvent).toHaveBeenCalledTimes(1);
    expect(telemetryClientMock.trackEvent).toHaveBeenCalledWith({
      name: "massiveJobs.FailedToScheduleNotificationBatches",
      properties: {
        error: sendError.message,
        jobId,
        scheduledTimestamp: "1700000017",
        tags: "000,001,002,003,004,005,006,007,008,009",
      },
    });
  });
});
