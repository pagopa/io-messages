import { HttpRequest, InvocationContext } from "@azure/functions";
import { afterEach, describe, expect, test, vi } from "vitest";

import { ErrorInternal } from "../../../domain/error";
import { CreateMassiveNotificationJobUseCase } from "../../../domain/use-cases/create-massive-notification-job";
import { createMassiveNotificationJobHandler } from "../create-massive-notification-job";

const context = new InvocationContext();

const makeRequest = (jsonFn: () => Promise<unknown> | unknown): HttpRequest =>
  ({ json: jsonFn }) as unknown as HttpRequest;

const useCaseMock = {
  execute: vi.fn(),
} as unknown as CreateMassiveNotificationJobUseCase;

const handler = createMassiveNotificationJobHandler(useCaseMock);

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

    expect(response).toMatchObject({
      body: JSON.stringify({ error: "Invalid JSON body" }),
      status: 400,
    });
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

    expect(response).toMatchObject({
      body: expect.stringContaining("Bad Request"),
      status: 400,
    });
    const responseBody = JSON.parse(response.body as string);
    expect(responseBody).toEqual(
      expect.objectContaining({
        details: expect.any(Array),
        error: "Bad Request",
      }),
    );
    expect(responseBody.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "too_small",
          path: ["title"],
        }),
      ]),
    );
    expect(useCaseMock.execute).not.toHaveBeenCalled();
  });

  test("should return 500 with error message when use case returns ErrorInternal", async () => {
    const error = new ErrorInternal("Something went wrong");
    vi.mocked(useCaseMock.execute).mockResolvedValueOnce(error);

    const request = makeRequest(() => Promise.resolve(aValidPayload));

    const response = await handler(request, context);

    expect(response).toMatchObject({
      body: JSON.stringify({ error: "Something went wrong" }),
      status: 500,
    });
    expect(useCaseMock.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        body: aValidPayload.body,
        executionTimeInHours: 2,
        startTimeTimestamp: expect.any(Number),
        title: aValidPayload.title,
      }),
    );
  });

  test("should return 500 with generic message when use case returns an unexpected error", async () => {
    vi.mocked(useCaseMock.execute).mockResolvedValueOnce(
      new ErrorInternal("Unexpected error"),
    );

    const request = makeRequest(() => Promise.resolve(aValidPayload));

    const response = await handler(request, context);

    expect(response).toMatchObject({
      body: JSON.stringify({ error: "Unexpected error" }),
      status: 500,
    });
  });

  test("should return 201 with the job id when use case succeeds", async () => {
    vi.mocked(useCaseMock.execute).mockResolvedValueOnce(aJobId);

    const request = makeRequest(() => Promise.resolve(aValidPayload));

    const response = await handler(request, context);

    expect(response).toMatchObject({
      body: JSON.stringify({ id: aJobId }),
      status: 201,
    });
    expect(useCaseMock.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        body: aValidPayload.body,
        executionTimeInHours: 2,
        startTimeTimestamp: expect.any(Number),
        title: aValidPayload.title,
      }),
    );
  });
});
