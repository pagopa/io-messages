import { afterEach, describe, expect, test, vi } from "vitest";

import { ErrorInternal } from "../../error";
import { MassiveJobsRepository } from "../../massive-jobs";
import { CreateMassiveNotificationJobUseCase } from "../create-massive-notification-job";

const aValidPayload = {
  body: "Notification body",
  executionTimeInHours: 4,
  startTimeTimestamp: 1700000000,
  title: "Notification title",
};

const aJobId = "550e8400-e29b-41d4-a716-446655440000";

const repositoryMock: MassiveJobsRepository = {
  createMassiveJob: vi.fn(),
  updateMassiveJob: vi.fn(),
};

const useCase = new CreateMassiveNotificationJobUseCase(repositoryMock);

describe("CreateMassiveNotificationJobUseCase", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  test("should return ErrorInternal when repository fails", async () => {
    const error = new ErrorInternal("Repository error");
    vi.mocked(repositoryMock.createMassiveJob).mockResolvedValueOnce(error);

    const result = await useCase.execute(aValidPayload);

    expect(result).toBeInstanceOf(ErrorInternal);
    expect(result).toMatchObject({ message: "Repository error" });
  });

  test("should call repository with the correct job shape on valid payload", async () => {
    vi.mocked(repositoryMock.createMassiveJob).mockResolvedValueOnce(aJobId);

    await useCase.execute(aValidPayload);

    expect(repositoryMock.createMassiveJob).toHaveBeenCalledWith(
      expect.objectContaining({
        body: aValidPayload.body,
        executionTimeInHours: aValidPayload.executionTimeInHours,
        id: expect.any(String),
        startTimeTimestamp: aValidPayload.startTimeTimestamp,
        status: "CREATED",
        title: aValidPayload.title,
      }),
    );
  });

  test("should return the job id string on success", async () => {
    vi.mocked(repositoryMock.createMassiveJob).mockResolvedValueOnce(aJobId);

    const result = await useCase.execute(aValidPayload);

    expect(result).toBe(aJobId);
  });

  test("should not set optional fields when they are not provided", async () => {
    vi.mocked(repositoryMock.createMassiveJob).mockResolvedValueOnce(aJobId);

    await useCase.execute(aValidPayload);

    expect(repositoryMock.createMassiveJob).toHaveBeenCalledWith(
      expect.objectContaining({
        body: aValidPayload.body,
        executionTimeInHours: aValidPayload.executionTimeInHours,
        startTimeTimestamp: aValidPayload.startTimeTimestamp,
        title: aValidPayload.title,
      }),
    );
  });
});
