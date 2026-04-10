import { TelemetryClient } from "applicationinsights";
import { afterEach, describe, expect, test, vi } from "vitest";

import { CheckJobMessageQueue } from "../../check-job-message";
import { ErrorInternal, ErrorNotFound } from "../../error";
import {
  MassiveJob,
  MassiveJobStatusEnum,
  MassiveJobsRepository,
  massiveJobIDSchema,
} from "../../massive-jobs";
import { SendNotificationMessageQueue } from "../../send-notification";
import { StartMassiveNotificationJobUseCase } from "../start-massive-notification-job";

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

const checkJobMessageQueueMock: CheckJobMessageQueue = {
  sendMessage: vi.fn(),
};

const sendNotificationMessageQueueMock: SendNotificationMessageQueue = {
  sendMessage: vi.fn(),
};

const telemetryClientMock: Pick<TelemetryClient, "trackException"> = {
  trackException: vi.fn(),
};

const useCase = new StartMassiveNotificationJobUseCase(
  repositoryMock,
  checkJobMessageQueueMock,
  sendNotificationMessageQueueMock,
  telemetryClientMock as TelemetryClient,
);

describe("StartMassiveNotificationJobUseCase", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  test("should propagate repository lookup errors", async () => {
    const repositoryError = new ErrorInternal("Repository error");
    vi.mocked(repositoryMock.getMassiveJob).mockResolvedValueOnce(
      repositoryError,
    );

    const result = await useCase.execute(jobId, requestedStartTimeTimestamp);

    expect(result).toBe(repositoryError);
    expect(checkJobMessageQueueMock.sendMessage).not.toHaveBeenCalled();
    expect(repositoryMock.updateMassiveJob).not.toHaveBeenCalled();
    expect(sendNotificationMessageQueueMock.sendMessage).not.toHaveBeenCalled();
  });

  test("should return an internal error when the job is not in CREATED status", async () => {
    vi.mocked(repositoryMock.getMassiveJob).mockResolvedValueOnce({
      ...baseJob,
      status: MassiveJobStatusEnum.enum.PROCESSING,
    });

    const result = await useCase.execute(jobId, requestedStartTimeTimestamp);

    expect(result).toBeInstanceOf(ErrorInternal);
    expect(result).toMatchObject({
      message: `Massive job with id ${jobId} is not in CREATED status`,
    });
    expect(checkJobMessageQueueMock.sendMessage).not.toHaveBeenCalled();
    expect(repositoryMock.updateMassiveJob).not.toHaveBeenCalled();
    expect(sendNotificationMessageQueueMock.sendMessage).not.toHaveBeenCalled();
  });

  test("should propagate check-job queue failures before updating the job", async () => {
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
    expect(sendNotificationMessageQueueMock.sendMessage).not.toHaveBeenCalled();
  });

  test("should propagate update failures after scheduling the status check message", async () => {
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
    expect(sendNotificationMessageQueueMock.sendMessage).not.toHaveBeenCalled();
  });

  test("should schedule all notification batches and return the job id on success", async () => {
    vi.spyOn(Date, "now").mockReturnValue(fixedNowMilliseconds);
    vi.mocked(repositoryMock.getMassiveJob).mockResolvedValueOnce(baseJob);
    vi.mocked(checkJobMessageQueueMock.sendMessage).mockResolvedValueOnce(
      "check-message-id",
    );
    vi.mocked(repositoryMock.updateMassiveJob).mockResolvedValueOnce(jobId);
    vi.mocked(sendNotificationMessageQueueMock.sendMessage).mockResolvedValue(
      "notification-message-id",
    );

    const result = await useCase.execute(jobId, requestedStartTimeTimestamp);

    expect(result).toBe(jobId);
    expect(checkJobMessageQueueMock.sendMessage).toHaveBeenCalledWith({
      jobId,
      visibilityTimeoutInSeconds: 11100,
    });
    expect(repositoryMock.updateMassiveJob).toHaveBeenCalledWith({
      ...baseJob,
      startTimeTimestamp: requestedStartTimeTimestamp,
      status: MassiveJobStatusEnum.enum.PROCESSING,
    });
    expect(sendNotificationMessageQueueMock.sendMessage).toHaveBeenCalledTimes(
      410,
    );
    expect(
      sendNotificationMessageQueueMock.sendMessage,
    ).toHaveBeenNthCalledWith(1, {
      jobId,
      scheduledTimestamp: 1700000017.578,
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
    });
    expect(
      sendNotificationMessageQueueMock.sendMessage,
    ).toHaveBeenLastCalledWith({
      jobId,
      scheduledTimestamp: 1700007207.031,
      tags: ["ffa", "ffb", "ffc", "ffd", "ffe", "fff"],
    });
    expect(telemetryClientMock.trackException).not.toHaveBeenCalled();
  });

  test("should track notification batch failures and continue processing remaining batches", async () => {
    vi.spyOn(Date, "now").mockReturnValue(fixedNowMilliseconds);
    vi.mocked(repositoryMock.getMassiveJob).mockResolvedValueOnce(baseJob);
    vi.mocked(checkJobMessageQueueMock.sendMessage).mockResolvedValueOnce(
      "check-message-id",
    );
    vi.mocked(repositoryMock.updateMassiveJob).mockResolvedValueOnce(jobId);

    const sendError = new ErrorInternal("Notification queue error");
    vi.mocked(sendNotificationMessageQueueMock.sendMessage)
      .mockResolvedValueOnce(sendError)
      .mockResolvedValue("notification-message-id");

    const result = await useCase.execute(jobId, requestedStartTimeTimestamp);

    expect(result).toBe(jobId);
    expect(sendNotificationMessageQueueMock.sendMessage).toHaveBeenCalledTimes(
      410,
    );
    expect(telemetryClientMock.trackException).toHaveBeenCalledTimes(1);
    expect(telemetryClientMock.trackException).toHaveBeenCalledWith({
      exception: sendError,
      properties: {
        batchIndex: 0,
        jobId,
        scheduledTimestamp: 1700000017.578,
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
      },
    });
  });
});
