import { InvocationContext, StorageQueueOutput } from "@azure/functions";
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

const queueOutputMock = {} as StorageQueueOutput;

const telemetryClientMock: Pick<TelemetryClient, "trackException"> = {
  trackException: vi.fn(),
};

const createUseCase = () =>
  new StartMassiveNotificationJobUseCase(
    repositoryMock,
    checkJobMessageQueueMock,
    queueOutputMock,
    telemetryClientMock as TelemetryClient,
  );

const createInvocationContext = () => {
  const context = new InvocationContext();
  const setSpy = vi.spyOn(context.extraOutputs, "set");

  return { context, setSpy };
};

describe("StartMassiveNotificationJobUseCase", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  test("should propagate repository lookup errors", async () => {
    const { context, setSpy } = createInvocationContext();
    const useCase = createUseCase();
    const repositoryError = new ErrorInternal("Repository error");
    vi.mocked(repositoryMock.getMassiveJob).mockResolvedValueOnce(
      repositoryError,
    );

    const result = await useCase.execute(
      context,
      jobId,
      requestedStartTimeTimestamp,
    );

    expect(result).toBe(repositoryError);
    expect(checkJobMessageQueueMock.sendMessage).not.toHaveBeenCalled();
    expect(repositoryMock.updateMassiveJob).not.toHaveBeenCalled();
    expect(setSpy).not.toHaveBeenCalled();
  });

  test("should return an internal error when the job is not in CREATED status", async () => {
    const { context, setSpy } = createInvocationContext();
    const useCase = createUseCase();
    vi.mocked(repositoryMock.getMassiveJob).mockResolvedValueOnce({
      ...baseJob,
      status: MassiveJobStatusEnum.enum.PROCESSING,
    });

    const result = await useCase.execute(
      context,
      jobId,
      requestedStartTimeTimestamp,
    );

    expect(result).toBeInstanceOf(ErrorInternal);
    expect(result).toMatchObject({
      message: `Massive job with id ${jobId} is not in CREATED status`,
    });
    expect(checkJobMessageQueueMock.sendMessage).not.toHaveBeenCalled();
    expect(repositoryMock.updateMassiveJob).not.toHaveBeenCalled();
    expect(setSpy).not.toHaveBeenCalled();
  });

  test("should propagate check-job queue failures before updating the job", async () => {
    const { context, setSpy } = createInvocationContext();
    const useCase = createUseCase();
    vi.spyOn(Date, "now").mockReturnValue(fixedNowMilliseconds);
    vi.mocked(repositoryMock.getMassiveJob).mockResolvedValueOnce(baseJob);

    const queueError = new ErrorInternal("Check queue error");
    vi.mocked(checkJobMessageQueueMock.sendMessage).mockResolvedValueOnce(
      queueError,
    );

    const result = await useCase.execute(
      context,
      jobId,
      requestedStartTimeTimestamp,
    );

    expect(result).toBe(queueError);
    expect(checkJobMessageQueueMock.sendMessage).toHaveBeenCalledWith({
      jobId,
      visibilityTimeoutInSeconds: 11100,
    });
    expect(repositoryMock.updateMassiveJob).not.toHaveBeenCalled();
    expect(setSpy).not.toHaveBeenCalled();
  });

  test("should propagate update failures after scheduling the status check message", async () => {
    const { context, setSpy } = createInvocationContext();
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

    const result = await useCase.execute(
      context,
      jobId,
      requestedStartTimeTimestamp,
    );

    expect(result).toBe(updateError);
    expect(repositoryMock.updateMassiveJob).toHaveBeenCalledWith({
      ...baseJob,
      startTimeTimestamp: requestedStartTimeTimestamp,
      status: MassiveJobStatusEnum.enum.PROCESSING,
    });
    expect(setSpy).not.toHaveBeenCalled();
  });

  test("should schedule all notification batches and return the job id on success", async () => {
    const { context, setSpy } = createInvocationContext();
    const useCase = createUseCase();
    vi.spyOn(Date, "now").mockReturnValue(fixedNowMilliseconds);
    vi.mocked(repositoryMock.getMassiveJob).mockResolvedValueOnce(baseJob);
    vi.mocked(checkJobMessageQueueMock.sendMessage).mockResolvedValueOnce(
      "check-message-id",
    );
    vi.mocked(repositoryMock.updateMassiveJob).mockResolvedValueOnce(jobId);

    const result = await useCase.execute(
      context,
      jobId,
      requestedStartTimeTimestamp,
    );

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
    expect(setSpy).toHaveBeenCalledTimes(1);
    expect(setSpy.mock.calls[0]?.[0]).toBe(queueOutputMock);

    const queuedMessages = setSpy.mock.calls[0]?.[1] as {
      jobId: typeof jobId;
      scheduledTimestamp: number;
      tags: string[];
    }[];

    expect(queuedMessages).toHaveLength(410);
    expect(queuedMessages[0]).toEqual({
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
    expect(queuedMessages.at(-1)).toEqual({
      jobId,
      scheduledTimestamp: 1700007207.031,
      tags: ["ffa", "ffb", "ffc", "ffd", "ffe", "fff"],
    });
    expect(telemetryClientMock.trackException).not.toHaveBeenCalled();
  });

  test("should track telemetry when queue output assignment fails", async () => {
    const { context, setSpy } = createInvocationContext();
    const useCase = createUseCase();
    vi.spyOn(Date, "now").mockReturnValue(fixedNowMilliseconds);
    vi.mocked(repositoryMock.getMassiveJob).mockResolvedValueOnce(baseJob);
    vi.mocked(checkJobMessageQueueMock.sendMessage).mockResolvedValueOnce(
      "check-message-id",
    );
    vi.mocked(repositoryMock.updateMassiveJob).mockResolvedValueOnce(jobId);

    const queueWriteError = new Error("Queue output failure");
    setSpy.mockImplementationOnce(() => {
      throw queueWriteError;
    });

    const result = await useCase.execute(
      context,
      jobId,
      requestedStartTimeTimestamp,
    );

    expect(result).toBe(jobId);
    expect(setSpy).toHaveBeenCalledTimes(1);
    expect(telemetryClientMock.trackException).toHaveBeenCalledTimes(1);
    expect(telemetryClientMock.trackException).toHaveBeenCalledWith({
      exception: queueWriteError,
      properties: {
        jobId,
      },
    });
  });
});
