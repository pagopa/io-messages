import { HttpRequest, InvocationContext } from "@azure/functions";
import { afterEach, describe, expect, test, vi } from "vitest";

import {
  ErrorConflict,
  ErrorInternal,
  ErrorNotFound,
} from "../../../domain/error";
import {
  CancelMassiveJobResult,
  massiveJobIDSchema,
} from "../../../domain/massive-jobs";
import { CancelMassiveNotificationJobUseCase } from "../../../domain/use-cases/cancel-massive-notification-job";
import { cancelMassiveNotificationJobHandler } from "../cancel-massive-notification-job";

const context = new InvocationContext();

const parseResponseBody = async <T>(response: Response): Promise<T> =>
  JSON.parse(await response.text());

const useCaseMock = {
  execute: vi.fn(),
} as unknown as CancelMassiveNotificationJobUseCase;

const handler = cancelMassiveNotificationJobHandler(useCaseMock);

const validJobId = massiveJobIDSchema.parse("01ARZ3NDEKTSV4RRFFQ69G5FAV");

describe("cancelMassiveNotificationJobHandler", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  test("should return 200 when use case succeeds", async () => {
    const cancelResult: CancelMassiveJobResult = {
      jobId: validJobId,
      status: "CANCELED",
    };
    vi.mocked(useCaseMock.execute).mockResolvedValueOnce(cancelResult);

    const request = {
      params: { id: validJobId },
    } as unknown as HttpRequest;

    const response = await handler(request, context);
    const responseBody = await parseResponseBody<CancelMassiveJobResult>(
      response as Response,
    );

    expect(response.status).toBe(200);
    expect(responseBody).toEqual(cancelResult);
    expect(useCaseMock.execute).toHaveBeenCalledWith(validJobId);
  });

  test("should return 404 when use case returns ErrorNotFound", async () => {
    vi.mocked(useCaseMock.execute).mockResolvedValueOnce(
      new ErrorNotFound("Massive job not found"),
    );

    const request = {
      params: { id: validJobId },
    } as unknown as HttpRequest;

    const response = await handler(request, context);
    const responseBody = await parseResponseBody<{ error: string }>(
      response as Response,
    );

    expect(response.status).toBe(404);
    expect(responseBody).toEqual({ error: "Massive job not found" });
    expect(useCaseMock.execute).toHaveBeenCalledWith(validJobId);
  });

  test("should return 500 when use case returns ErrorInternal", async () => {
    const internalErrorMessage = "Unexpected error";
    vi.mocked(useCaseMock.execute).mockResolvedValueOnce(
      new ErrorInternal(internalErrorMessage),
    );

    const request = {
      params: { id: validJobId },
    } as unknown as HttpRequest;

    const response = await handler(request, context);
    const responseBody = await parseResponseBody<{ error: string }>(
      response as Response,
    );

    expect(response.status).toBe(500);
    expect(responseBody).toEqual(
      expect.objectContaining({ error: internalErrorMessage }),
    );
    expect(useCaseMock.execute).toHaveBeenCalledWith(validJobId);
  });

  test("should return 400 when use case returns ErrorConflict", async () => {
    const aConflictErrorMessage =
      "Jobs with 'CREATED' status cannot be stopped";
    vi.mocked(useCaseMock.execute).mockResolvedValueOnce(
      new ErrorConflict(aConflictErrorMessage),
    );

    const request = {
      params: { id: validJobId },
    } as unknown as HttpRequest;

    const response = await handler(request, context);
    const responseBody = await parseResponseBody<{
      error: string;
      jobId: string;
      status: string;
    }>(response as Response);

    expect(response.status).toBe(409);
    expect(responseBody.error).toBe(aConflictErrorMessage);
    expect(responseBody.jobId).toBe(validJobId);
    expect(useCaseMock.execute).toHaveBeenCalledWith(validJobId);
  });

  test("should return 400 when id path parameter is invalid", async () => {
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
    expect(useCaseMock.execute).not.toHaveBeenCalled();
  });
});
