import { NotRejectedMessageStatusValueEnum } from "@pagopa/io-functions-commons/dist/generated/definitions/NotRejectedMessageStatusValue";
import * as TE from "fp-ts/TaskEither";
import { toPermanentFailure, TransientFailure } from "../../utils/errors";
import * as mw from "../../utils/message_view";
import { aMessageStatus } from "../../__mocks__/message";
import { handle } from "../handler";
import { vi, beforeEach, describe, test, expect } from "vitest";

const mockAppinsights = {
  trackEvent: vi.fn().mockReturnValue(void 0)
};

const mockQueueClient = {
  sendMessage: vi.fn().mockImplementation(() => Promise.resolve(void 0))
};

const handleStatusChangeUtilityMock = vi
  .fn()
  .mockImplementation(() => TE.of(void 0));
vi
  .spyOn(mw, "handleStatusChange")
  .mockImplementation(() => handleStatusChangeUtilityMock);

const anyParam = {} as any;

const aTransientFailure: TransientFailure = {
  kind: "TRANSIENT",
  reason: "aReason"
};

describe("handle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("GIVEN a malformed messageStatus WHEN decoding input THEN it should return a not retriable Error", async () => {
    const result = await handle(
      mockAppinsights as any,
      mockQueueClient as any,
      anyParam,
      anyParam,
      anyParam,
      { ...aMessageStatus, fiscalCode: undefined }
    );

    expect(mockQueueClient.sendMessage).toHaveBeenCalled();
    expect(mockAppinsights.trackEvent).toHaveBeenCalled();
    expect(mockAppinsights.trackEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "trigger.messages.cqrs.updatemessageview.failed"
      })
    );
    expect(result).toEqual(
      expect.objectContaining({
        body: { ...aMessageStatus, fiscalCode: undefined },
        retriable: false
      })
    );
  });

  test("GIVEN a messageStatus WHEN handleStatusChange returns a transient failure THEN it should return a retriable Error", async () => {
    handleStatusChangeUtilityMock.mockImplementationOnce(() =>
      TE.left(aTransientFailure)
    );
    const result = await handle(
      mockAppinsights as any,
      mockQueueClient as any,
      anyParam,
      anyParam,
      anyParam,
      aMessageStatus
    );

    expect(mockQueueClient.sendMessage).toHaveBeenCalled();
    expect(mockAppinsights.trackEvent).toHaveBeenCalled();
    expect(mockAppinsights.trackEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "trigger.messages.cqrs.updatemessageview.failed"
      })
    );
    expect(result).toEqual(
      expect.objectContaining({
        body: aMessageStatus,
        retriable: true
      })
    );
  });

  test("GIVEN a messageStatus WHEN handleStatusChange returns a permanent failure THEN it should return a not retriable Error", async () => {
    handleStatusChangeUtilityMock.mockImplementationOnce(() =>
      TE.left(toPermanentFailure(Error("PERMANENT")))
    );
    const result = await handle(
      mockAppinsights as any,
      mockQueueClient as any,
      anyParam,
      anyParam,
      anyParam,
      aMessageStatus
    );

    expect(mockQueueClient.sendMessage).toHaveBeenCalled();
    expect(mockAppinsights.trackEvent).toHaveBeenCalled();
    expect(mockAppinsights.trackEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "trigger.messages.cqrs.updatemessageview.failed"
      })
    );
    expect(result).toEqual(
      expect.objectContaining({
        body: aMessageStatus,
        retriable: false
      })
    );
  });

  test("GIVEN a messageStatus WHEN handleStatusChange returns void THEN it should return void without store any error", async () => {
    const result = await handle(
      mockAppinsights as any,
      mockQueueClient as any,
      anyParam,
      anyParam,
      anyParam,
      aMessageStatus
    );

    expect(mockQueueClient.sendMessage).not.toHaveBeenCalled();
    expect(mockAppinsights.trackEvent).not.toHaveBeenCalled();
    expect(result).toEqual(void 0);
  });

  test("GIVEN a messageStatus WHEN status is not PROCESSED THEN it should return void without store any error", async () => {
    const result = await handle(
      mockAppinsights as any,
      mockQueueClient as any,
      anyParam,
      anyParam,
      anyParam,
      { ...aMessageStatus, status: NotRejectedMessageStatusValueEnum.FAILED }
    );

    expect(mockQueueClient.sendMessage).not.toHaveBeenCalled();
    expect(mockAppinsights.trackEvent).not.toHaveBeenCalled();
    expect(result).toEqual(void 0);
  });

  test("GIVEN a messageStatus WHEN handleStatusChange returns a transient failure and error queue storage is not working THEN it should throw an error", async () => {
    handleStatusChangeUtilityMock.mockImplementationOnce(() =>
      TE.left(aTransientFailure)
    );
    const aCreationError = new Error("createEntity failed");
    mockQueueClient.sendMessage.mockImplementationOnce(() =>
      Promise.reject(aCreationError)
    );

    await expect(
      handle(
        mockAppinsights as any,
        mockQueueClient as any,
        anyParam,
        anyParam,
        anyParam,
        aMessageStatus
      )
    ).rejects.toEqual(aCreationError);

    expect(mockQueueClient.sendMessage).toHaveBeenCalled();
    expect(mockAppinsights.trackEvent).toHaveBeenCalled();
    expect(mockAppinsights.trackEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        name:
          "trigger.messages.cqrs.updatemessageview.failedwithoutstoringerror"
      })
    );
  });
});
