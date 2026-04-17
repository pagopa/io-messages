import { HttpRequest, InvocationContext } from "@azure/functions";
import { afterEach, describe, expect, test, vi } from "vitest";

import { ErrorInternal } from "../../../domain/error";
import { MakeCreateMassiveNotificationJobUseCase } from "../../../domain/use-cases/create-massive-notification-job";
import { createMassiveNotificationJobHandler } from "../create-massive-notification-job";

const context = new InvocationContext();

const makeRequest = (jsonFn: () => Promise<object> | object): HttpRequest =>
  ({ json: jsonFn }) as HttpRequest;

const parseResponseBody = async <T>(response: Response): Promise<T> =>
  JSON.parse(await response.text()) as T;

const useCaseMock: Pick<MakeCreateMassiveNotificationJobUseCase, "execute"> = {
  execute: vi.fn(),
};

const handler = createMassiveNotificationJobHandler(
  useCaseMock as MakeCreateMassiveNotificationJobUseCase,
);

const aValidPayload = {
  body: "Notification body",
  title: "Notification title",
};

const aJobId = "550e8400-e29b-41d4-a716-446655440000";

describe("createMassiveNotificationJobHandler", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  test("should return 400 when the request body is not valid JSON", async () => {
    const request = makeRequest(() => {
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

  test("should return 400 with validation details when payload is invalid", async () => {
    const request = makeRequest(() =>
      Promise.resolve({
        ...aValidPayload,
        title: "",
      }),
    );

    const response = await handler(request, context);
    const responseBody = await parseResponseBody<{
      error: string;
      issues: object[];
    }>(response as Response);

    expect(response.status).toBe(400);
    expect(responseBody).toEqual(
      expect.objectContaining({
        error: "Invalid request body",
        issues: expect.any(Array),
      }),
    );
    expect(useCaseMock.execute).not.toHaveBeenCalled();
  });

  test("should return 500 with error message when use case returns ErrorInternal", async () => {
    const error = new ErrorInternal("Something went wrong");
    vi.mocked(useCaseMock.execute).mockResolvedValueOnce(error);

    const request = makeRequest(() => Promise.resolve(aValidPayload));

    const response = await handler(request, context);
    const responseBody = await parseResponseBody<{ error: string }>(
      response as Response,
    );

    expect(response.status).toBe(500);
    expect(responseBody).toEqual({ error: "Something went wrong" });
    expect(useCaseMock.execute).toHaveBeenCalledWith(
      aValidPayload.body,
      2,
      aValidPayload.title,
    );
  });

  test("should return 500 with generic message when use case returns an unexpected error", async () => {
    vi.mocked(useCaseMock.execute).mockResolvedValueOnce(
      new ErrorInternal("Unexpected error"),
    );

    const request = makeRequest(() => Promise.resolve(aValidPayload));

    const response = await handler(request, context);
    const responseBody = await parseResponseBody<{ error: string }>(
      response as Response,
    );

    expect(response.status).toBe(500);
    expect(responseBody).toEqual({ error: "Unexpected error" });
  });

  test("should return 201 with the job id and status when use case succeeds", async () => {
    vi.mocked(useCaseMock.execute).mockResolvedValueOnce({
      id: aJobId,
      status: "CREATED",
    });

    const request = makeRequest(() => Promise.resolve(aValidPayload));

    const response = await handler(request, context);
    const responseBody = await parseResponseBody<{
      id: string;
      status: string;
    }>(response as Response);

    expect(response.status).toBe(201);
    expect(responseBody).toEqual({ id: aJobId, status: "CREATED" });
    expect(useCaseMock.execute).toHaveBeenCalledWith(
      aValidPayload.body,
      2,
      aValidPayload.title,
    );
  });
});
