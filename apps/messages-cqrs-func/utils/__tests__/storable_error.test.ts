import * as E from "fp-ts/Either";
import { storeAndLogError } from "../storable_error";
import { vi, beforeEach, describe, test, expect } from "vitest";

const dummyDocument = {
  test: "test value"
};

const dummyStorableError = {
  name: "Storable Error",
  body: dummyDocument,
  message: "error message",
  retriable: true
};

const cqrsLogName = "logName";

const mockAppInsights = {
  trackEvent: vi.fn().mockReturnValue(void 0)
};

const mockQueueClient = {
  sendMessage: vi.fn().mockImplementation(() => Promise.resolve(void 0))
};
describe("storeAndLogError", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("GIVEN a working queue storage client WHEN an error is stored THEN a new entity in the queue is created and an event is tracked", async () => {
    mockQueueClient.sendMessage.mockImplementationOnce(() =>
      Promise.resolve(true)
    );
    const result = await storeAndLogError(
      mockQueueClient as any,
      mockAppInsights as any,
      cqrsLogName
    )(dummyStorableError)();

    expect(E.isRight(result)).toBeTruthy();
    expect(mockQueueClient.sendMessage).toBeCalledWith(
      Buffer.from(
        JSON.stringify({
          ...dummyStorableError,
          body: dummyStorableError.body
        })
      ).toString("base64")
    );
    expect(mockAppInsights.trackEvent).toBeCalledWith(
      expect.objectContaining({
        name: `trigger.messages.cqrs.${cqrsLogName}.failed`
      })
    );
  });

  test("GIVEN a not working queue storage client WHEN an error is stored THEN no entities are created and an event is tracked", async () => {
    mockQueueClient.sendMessage.mockImplementationOnce(() =>
      Promise.reject(new Error("createEntity failed"))
    );
    const result = await storeAndLogError(
      mockQueueClient as any,
      mockAppInsights as any,
      cqrsLogName
    )(dummyStorableError)();

    expect(E.isLeft(result)).toBeTruthy();
    expect(mockQueueClient.sendMessage).toBeCalledWith(
      Buffer.from(
        JSON.stringify({
          ...dummyStorableError,
          body: dummyStorableError.body
        })
      ).toString("base64")
    );
    expect(mockAppInsights.trackEvent).toBeCalledWith(
      expect.objectContaining({
        name: `trigger.messages.cqrs.${cqrsLogName}.failedwithoutstoringerror`
      })
    );
  });
});
