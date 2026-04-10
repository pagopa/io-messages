import { HttpRequest, InvocationContext } from "@azure/functions";
import { afterEach, describe, expect, test, vi } from "vitest";

import { ErrorInternal } from "../../../domain/error";
import { massiveJobIDSchema } from "../../../domain/massive-jobs";
import { StartMassiveNotificationJobUseCase } from "../../../domain/use-cases/start-massive-notification-job";
import { startMassiveNotificationJobHandler } from "../start-massive-notification-job";

const context = new InvocationContext();

const makeRequest = (
  params: Record<string, string>,
  jsonFn: () => Promise<object> | object,
): HttpRequest => ({ json: jsonFn, params }) as unknown as HttpRequest;

const parseResponseBody = async <T>(response: Response): Promise<T> =>
  JSON.parse(await response.text()) as T;

const useCaseMock: Pick<StartMassiveNotificationJobUseCase, "execute"> = {
  execute: vi.fn(),
};

const handler = startMassiveNotificationJobHandler(
  useCaseMock as StartMassiveNotificationJobUseCase,
);

const validJobId = massiveJobIDSchema.parse("01ARZ3NDEKTSV4RRFFQ69G5FAV");
const futureTimestamp = Math.floor((Date.now() + 60 * 60 * 1000) / 1000); // 1 hour from now
const newJobId = "01ARZ3NDEKTSV4RRFFQ69G5FAB";

describe("startMassiveNotificationJobHandler", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  test("should return 400 when the job id in params is invalid", async () => {
    const request = makeRequest({ id: "invalid-id" }, () =>
      Promise.resolve({ startTimeTimestamp: futureTimestamp }),
    );

    const response = await handler(request, context);
    const responseBody = await parseResponseBody<{
      error: string;
      issues: object[];
    }>(response as Response);

    expect(response.status).toBe(400);
    expect(responseBody).toEqual(
      expect.objectContaining({
        error: "Invalid job id in request params",
        issues: expect.any(Array),
      }),
    );
    expect(useCaseMock.execute).not.toHaveBeenCalled();
  });

  test("should return 400 when the request body is not valid JSON", async () => {
    const request = makeRequest({ id: validJobId }, () => {
      throw new SyntaxError("Unexpected token");
    });

    const response = await handler(request, context);
    const responseBody = await parseResponseBody<{ error: string }>(
      response as Response,
    );

    expect(response.status).toBe(400);
    expect(responseBody).toEqual({ error: "Invalid JSON body" });
    expect(useCaseMock.execute).not.toHaveBeenCalled();
  });

  test("should return 400 with validation details when startTimeTimestamp is in the past", async () => {
    const pastTimestamp = Math.floor(Date.now() / 1000) - 100;
    const request = makeRequest({ id: validJobId }, () =>
      Promise.resolve({ startTimeTimestamp: pastTimestamp }),
    );

    const response = await handler(request, context);
    const responseBody = await parseResponseBody<{
      error: string;
      issues: object[];
    }>(response as Response);

    expect(response.status).toBe(400);
    expect(responseBody).toEqual(
      expect.objectContaining({
        error: expect.any(String),
        issues: expect.any(Array),
      }),
    );
    expect(useCaseMock.execute).not.toHaveBeenCalled();
  });

  test("should return 400 with validation details when startTimeTimestamp is less than 30 minutes in the future", async () => {
    const insufficientFutureTimestamp = Math.floor(
      (Date.now() + 15 * 60 * 1000) / 1000,
    ); // 15 minutes from now
    const request = makeRequest({ id: validJobId }, () =>
      Promise.resolve({ startTimeTimestamp: insufficientFutureTimestamp }),
    );

    const response = await handler(request, context);
    const responseBody = await parseResponseBody<{
      error: string;
      issues: object[];
    }>(response as Response);

    expect(response.status).toBe(400);
    expect(responseBody).toEqual(
      expect.objectContaining({
        error: expect.any(String),
        issues: expect.any(Array),
      }),
    );
    expect(useCaseMock.execute).not.toHaveBeenCalled();
  });

  test("should return 500 with error message when use case returns ErrorInternal", async () => {
    const error = new ErrorInternal("Something went wrong");
    vi.mocked(useCaseMock.execute).mockResolvedValueOnce(error);

    const request = makeRequest({ id: validJobId }, () =>
      Promise.resolve({ startTimeTimestamp: futureTimestamp }),
    );

    const response = await handler(request, context);
    const responseBody = await parseResponseBody<{ error: string }>(
      response as Response,
    );

    expect(response.status).toBe(500);
    expect(responseBody).toEqual({ error: "Something went wrong" });
    expect(useCaseMock.execute).toHaveBeenCalledWith(
      validJobId,
      futureTimestamp,
    );
  });

  test("should return 201 with the new job id when use case succeeds", async () => {
    vi.mocked(useCaseMock.execute).mockResolvedValueOnce(newJobId);

    const request = makeRequest({ id: validJobId }, () =>
      Promise.resolve({ startTimeTimestamp: futureTimestamp }),
    );

    const response = await handler(request, context);
    const responseBody = await parseResponseBody<{ id: string }>(
      response as Response,
    );

    expect(response.status).toBe(201);
    expect(responseBody).toEqual({ id: newJobId });
    expect(useCaseMock.execute).toHaveBeenCalledWith(
      validJobId,
      futureTimestamp,
    );
  });

  test("should use default startTimeTimestamp (1 hour from now) when not provided", async () => {
    vi.mocked(useCaseMock.execute).mockResolvedValueOnce(newJobId);

    const request = makeRequest(
      { id: validJobId },
      () => Promise.resolve({}), // empty payload, should use default
    );

    const response = await handler(request, context);
    const responseBody = await parseResponseBody<{ id: string }>(
      response as Response,
    );

    expect(response.status).toBe(201);
    expect(responseBody).toEqual({ id: newJobId });
    expect(useCaseMock.execute).toHaveBeenCalledWith(
      validJobId,
      expect.any(Number),
    );
    // Verify the timestamp is roughly 1 hour from now
    const callTimestamp = vi.mocked(useCaseMock.execute).mock.calls[0][1];
    const oneHourFromNow = Math.floor((Date.now() + 60 * 60 * 1000) / 1000);
    expect(callTimestamp).toBeGreaterThanOrEqual(oneHourFromNow - 2);
    expect(callTimestamp).toBeLessThanOrEqual(oneHourFromNow + 2);
  });
});
