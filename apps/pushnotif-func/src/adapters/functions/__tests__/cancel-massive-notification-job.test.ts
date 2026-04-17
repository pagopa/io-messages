import { HttpRequest, InvocationContext } from "@azure/functions";
import { afterEach, describe, expect, test, vi } from "vitest";

import {
  ErrorInternal,
  ErrorNotAccepted,
  ErrorNotFound,
} from "../../../domain/error";
import {
  CancelMassiveJobResult,
  massiveJobIDSchema,
} from "../../../domain/massive-jobs";
import { CancelMassiveNotificationJobUseCase } from "../../../domain/use-cases/cancel-massive-notification-job";
import { makeCancelMassiveNotificationJobHandler } from "../cancel-massive-notification-job";

const context = new InvocationContext();

const parseResponseBody = async <T>(response: Response): Promise<T> =>
  JSON.parse(await response.text());

const useCaseMock = {
  execute: vi.fn(),
} as unknown as CancelMassiveNotificationJobUseCase;

const handler = makeCancelMassiveNotificationJobHandler(useCaseMock);

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
    const aNotFoundError = new ErrorNotFound(
      "Massive job not found",
      `Massive job with ID ${validJobId} not found`,
    );
    vi.mocked(useCaseMock.execute).mockResolvedValueOnce(aNotFoundError);

    const request = {
      params: { id: validJobId },
    } as unknown as HttpRequest;

    const response = await handler(request, context);
    const responseBody = await parseResponseBody<{
      cause: string;
      error: string;
    }>(response as Response);

    expect(response.status).toBe(404);
    expect(responseBody).toEqual(
      expect.objectContaining({
        cause: aNotFoundError.cause,
        error: aNotFoundError.message,
      }),
    );
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

  test("should return 406 when use case returns ErrorNotAccepted", async () => {
    const aNotAcceptedError = new ErrorNotAccepted(
      "Jobs with 'CREATED' status cannot be stopped",
    );
    vi.mocked(useCaseMock.execute).mockResolvedValueOnce(aNotAcceptedError);

    const request = {
      params: { id: validJobId },
    } as unknown as HttpRequest;

    const response = await handler(request, context);
    const responseBody = await parseResponseBody<{
      error: string;
      jobId: string;
      status: string;
    }>(response as Response);

    expect(response.status).toBe(406);
    expect(responseBody).toEqual(
      expect.objectContaining({
        error: aNotAcceptedError.message,
      }),
    );

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
