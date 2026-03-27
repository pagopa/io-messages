import { describe, expect, test, vi } from "vitest";

import { ErrorInternal, ErrorValidation } from "../../error";
import { MassiveJobsRepository } from "../../massive-jobs";
import { CreateMassiveNotificationJobUseCase } from "../create-massive-notification-job";

const aValidPayload = {
  body: "Notification body",
  title: "Notification title",
};

const aJobId = "550e8400-e29b-41d4-a716-446655440000";

const repositoryMock: MassiveJobsRepository = {
  createMassiveJob: vi.fn(),
  updateMassiveJob: vi.fn(),
};

const useCase = new CreateMassiveNotificationJobUseCase(repositoryMock);

describe("CreateMassiveNotificationJobUseCase", () => {
  test("should return ErrorValidation when payload is missing required fields", async () => {
    const result = await useCase.execute({});

    expect(result).toBeInstanceOf(ErrorValidation);
  });

  test("should return ErrorValidation when payload has invalid field types", async () => {
    const result = await useCase.execute({
      body: 123,
      title: "",
    });

    expect(result).toBeInstanceOf(ErrorValidation);
  });

  test("should return ErrorValidation when payload is not an object", async () => {
    const result = await useCase.execute("invalid");

    expect(result).toBeInstanceOf(ErrorValidation);
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
        id: expect.any(String),
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

  test("should apply default values for optional fields when not provided", async () => {
    vi.mocked(repositoryMock.createMassiveJob).mockResolvedValueOnce(aJobId);

    await useCase.execute(aValidPayload);

    expect(repositoryMock.createMassiveJob).toHaveBeenCalledWith(
      expect.objectContaining({
        executionTimeInHours: 2,
        startTimeTimestamp: expect.any(Number),
      }),
    );
  });

  test("should use provided optional fields when given", async () => {
    vi.mocked(repositoryMock.createMassiveJob).mockResolvedValueOnce(aJobId);

    const payloadWithOptionals = {
      ...aValidPayload,
      executionTimeInHours: 6,
      startTimeTimestamp: 1900000000,
    };

    await useCase.execute(payloadWithOptionals);

    expect(repositoryMock.createMassiveJob).toHaveBeenCalledWith(
      expect.objectContaining({
        executionTimeInHours: 6,
        startTimeTimestamp: 1900000000,
      }),
    );
  });
});
