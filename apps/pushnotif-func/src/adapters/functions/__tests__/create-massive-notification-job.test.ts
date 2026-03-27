import { HttpRequest, InvocationContext } from "@azure/functions";
import { afterEach, describe, expect, test, vi } from "vitest";

import { ErrorInternal, ErrorValidation } from "../../../domain/error";
import { CreateMassiveNotificationJobUseCase } from "../../../domain/use-cases/create-massive-notification-job";
import { createMassiveNotificationJobHandler } from "../create-massive-notification-job";

const context = new InvocationContext();

const makeRequest = (jsonFn: () => Promise<unknown>): HttpRequest =>
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
    const request = makeRequest(() =>
      Promise.reject(new SyntaxError("Unexpected token")),
    );

    const response = await handler(request, context);

    expect(response).toMatchObject({
      body: JSON.stringify({ error: "Invalid JSON body" }),
      status: 400,
    });
    expect(useCaseMock.execute).not.toHaveBeenCalled();
  });

  test("should return 400 with validation details when use case returns ErrorValidation", async () => {
    const issues = [{ code: "too_small", message: "Required" }];
    const error = new ErrorValidation("Invalid payload", { issues });
    error.issues = issues;

    vi.mocked(useCaseMock.execute).mockResolvedValueOnce(error);

    const request = makeRequest(() => Promise.resolve(aValidPayload));

    const response = await handler(request, context);

    expect(response).toMatchObject({
      body: JSON.stringify({ details: issues, error: "Bad Request" }),
      status: 400,
    });
    expect(useCaseMock.execute).toHaveBeenCalledWith(aValidPayload);
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
    expect(useCaseMock.execute).toHaveBeenCalledWith(aValidPayload);
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
    expect(useCaseMock.execute).toHaveBeenCalledWith(aValidPayload);
  });
});
