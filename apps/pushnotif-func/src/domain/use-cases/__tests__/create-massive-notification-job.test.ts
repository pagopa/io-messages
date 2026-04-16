import { afterEach, describe, expect, test, vi } from "vitest";

import { ErrorInternal } from "../../error";
import { MassiveJobsRepository } from "../../massive-jobs";
import { MakeCreateMassiveNotificationJobUseCase } from "../create-massive-notification-job";

const aValidPayload = {
  body: "Notification body",
  executionTimeInHours: 4,
  title: "Notification title",
};

const aJobId = "550e8400-e29b-41d4-a716-446655440000";

const repositoryMock: MassiveJobsRepository = {
  createMassiveJob: vi.fn(),
  getMassiveJob: vi.fn(),
  updateMassiveJob: vi.fn(),
};

const useCase = new MakeCreateMassiveNotificationJobUseCase(repositoryMock);

describe("CreateMassiveNotificationJobUseCase", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  test("should return ErrorInternal when repository fails", async () => {
    const error = new ErrorInternal("Repository error");
    vi.mocked(repositoryMock.createMassiveJob).mockResolvedValueOnce(error);

    const result = await useCase.execute(
      aValidPayload.body,
      aValidPayload.executionTimeInHours,
      aValidPayload.title,
    );

    expect(result).toBeInstanceOf(ErrorInternal);
    expect(result).toMatchObject({ message: "Repository error" });
  });

  test("should call repository with the correct job shape on valid payload", async () => {
    vi.mocked(repositoryMock.createMassiveJob).mockResolvedValueOnce(aJobId);

    await useCase.execute(
      aValidPayload.body,
      aValidPayload.executionTimeInHours,
      aValidPayload.title,
    );

    expect(repositoryMock.createMassiveJob).toHaveBeenCalledWith(
      expect.objectContaining({
        body: aValidPayload.body,
        executionTimeInHours: aValidPayload.executionTimeInHours,
        id: expect.any(String),
        status: "CREATED",
        title: aValidPayload.title,
      }),
    );
  });

  test("should return job id and status on success", async () => {
    vi.mocked(repositoryMock.createMassiveJob).mockResolvedValueOnce(aJobId);

    const result = await useCase.execute(
      aValidPayload.body,
      aValidPayload.executionTimeInHours,
      aValidPayload.title,
    );

    expect(result).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        status: "CREATED",
      }),
    );
  });

  test("should not include startTimeTimestamp in create payload", async () => {
    vi.mocked(repositoryMock.createMassiveJob).mockResolvedValueOnce(aJobId);

    await useCase.execute(
      aValidPayload.body,
      aValidPayload.executionTimeInHours,
      aValidPayload.title,
    );

    const createdJob = vi.mocked(repositoryMock.createMassiveJob).mock
      .calls[0][0];

    expect(createdJob).toEqual(
      expect.objectContaining({
        body: aValidPayload.body,
        executionTimeInHours: aValidPayload.executionTimeInHours,
        title: aValidPayload.title,
      }),
    );
    expect(createdJob).not.toHaveProperty("startTimeTimestamp");
  });
});
