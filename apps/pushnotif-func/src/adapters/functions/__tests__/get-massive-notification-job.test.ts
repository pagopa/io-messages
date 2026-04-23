import { HttpRequest, InvocationContext } from "@azure/functions";
import { afterEach, describe, expect, test, vi } from "vitest";

import { ErrorInternal, ErrorNotFound } from "../../../domain/error";
import {
  MassiveJob,
  MassiveJobsRepository,
  MassiveProgressRepository,
  massiveJobIDSchema,
} from "../../../domain/massive-jobs";
import { GetMassiveNotificationJobUseCase } from "../../../domain/use-cases/get-massive-notification-job";
import { getGetMassiveNotificationJobHandler } from "../get-massive-notification-job";

const context = new InvocationContext();

const parseResponseBody = async <T>(response: Response): Promise<T> =>
  JSON.parse(await response.text());

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

const handler = getGetMassiveNotificationJobHandler(useCase);

const validJobId = massiveJobIDSchema.parse("01ARZ3NDEKTSV4RRFFQ69G5FAV");

const validJob: MassiveJob = {
  executionTimeInHours: 2,
  id: validJobId,
  message: "Notification body",
  startTimeTimestamp: 1700000000,
  status: "CREATED",
  title: "Notification title",
};

describe("getGetMassiveNotificationJobHandler", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  test("should return 200 and job payload when use case succeeds", async () => {
    const executeSpy = vi
      .spyOn(useCase, "execute")
      .mockResolvedValueOnce(validJob);

    const request = {
      params: { id: validJobId },
    } as unknown as HttpRequest;

    const response = await handler(request, context);
    const responseBody = await parseResponseBody<MassiveJob>(
      response as Response,
    );

    expect(response.status).toBe(200);
    expect(responseBody).toEqual(validJob);
    expect(executeSpy).toHaveBeenCalledWith(validJobId);
  });

  test("should return 404 when use case returns ErrorNotFound", async () => {
    const executeSpy = vi
      .spyOn(useCase, "execute")
      .mockResolvedValueOnce(new ErrorNotFound("Massive job not found"));

    const request = {
      params: { id: validJobId },
    } as unknown as HttpRequest;

    const response = await handler(request, context);
    const responseBody = await parseResponseBody<{ error: string }>(
      response as Response,
    );

    expect(response.status).toBe(404);
    expect(responseBody).toEqual({ error: "Massive job not found" });
    expect(executeSpy).toHaveBeenCalledWith(validJobId);
  });

  test("should return 500 when use case returns ErrorInternal", async () => {
    const executeSpy = vi
      .spyOn(useCase, "execute")
      .mockResolvedValueOnce(new ErrorInternal("Unexpected error"));

    const request = {
      params: { id: validJobId },
    } as unknown as HttpRequest;

    const response = await handler(request, context);
    const responseBody = await parseResponseBody<{ error: string }>(
      response as Response,
    );

    expect(response.status).toBe(500);
    expect(responseBody).toEqual(
      expect.objectContaining({ error: "Unexpected error" }),
    );
    expect(executeSpy).toHaveBeenCalledWith(validJobId);
  });

  test("should return 400 when id path parameter is invalid", async () => {
    const executeSpy = vi.spyOn(useCase, "execute");
    const request = {
      params: { id: "invalid-id" },
    } as unknown as HttpRequest;

    const response = await handler(request, context);
    const responseBody = await parseResponseBody<{ error: string }>(
      response as Response,
    );

    expect(response.status).toBe(400);
    expect(responseBody).toEqual(
      expect.objectContaining({
        error: "Invalid job id in request params",
      }),
    );
    expect(executeSpy).not.toHaveBeenCalled();
  });
});
