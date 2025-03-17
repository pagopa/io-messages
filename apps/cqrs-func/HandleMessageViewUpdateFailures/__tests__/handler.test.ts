import * as util from "../../utils/message_view";
import * as TE from "fp-ts/lib/TaskEither";
import { HandleMessageViewUpdateFailureHandler } from "../handler";
import { Context } from "@azure/functions";
import { HandleMessageViewFailureInput } from "../../utils/message_view";
import { aMessageStatus } from "../../__mocks__/message";
import { TelemetryClient } from "../../utils/appinsights";
import { TransientFailure } from "../../utils/errors";
import { vi, beforeEach, describe, test, expect } from "vitest";

const functionsContextMock = ({
  log: {
    error: vi.fn()
  }
} as unknown) as Context;

const telemetryClientMock = ({
  trackException: vi.fn(_ => void 0)
} as unknown) as TelemetryClient;

const handleStatusChangeMock = vi
  .fn()
  .mockImplementation(() => TE.of(void 0));
vi
  .spyOn(util, "handleStatusChange")
  .mockImplementation(() => handleStatusChangeMock);

const inputMessage = {
  body: {
    ...aMessageStatus
  },
  message: "aMessage"
};

const aRetriableInput: HandleMessageViewFailureInput = {
  ...inputMessage,
  retriable: true
};

const aNotRetriableInput: HandleMessageViewFailureInput = {
  ...inputMessage,
  retriable: false
};

const aTransientFailure: TransientFailure = {
  kind: "TRANSIENT",
  reason: "aReason"
};
const anyParam = {} as any;

describe("HandleMessageViewUpdateFailureHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  test("shoud return void if everything works fine", async () => {
    await expect(
      HandleMessageViewUpdateFailureHandler(
        functionsContextMock,
        aRetriableInput,
        telemetryClientMock,
        anyParam,
        anyParam,
        anyParam
      )
    ).resolves.toEqual(void 0);
    expect(telemetryClientMock.trackException).not.toHaveBeenCalled();
  });

  test("shoud throw if Transient failure occurs", async () => {
    handleStatusChangeMock.mockImplementationOnce(() =>
      TE.left(aTransientFailure)
    );
    await expect(
      HandleMessageViewUpdateFailureHandler(
        functionsContextMock,
        aRetriableInput,
        telemetryClientMock,
        anyParam,
        anyParam,
        anyParam
      )
    ).rejects.toBeDefined();
    expect(telemetryClientMock.trackException).toHaveBeenCalledWith(
      expect.objectContaining({
        tagOverrides: { samplingEnabled: "true" }
      })
    );
  });

  test("shoud return a Permanent failure if input decode fails", async () => {
    await expect(
      HandleMessageViewUpdateFailureHandler(
        functionsContextMock,
        { wrongInput: true },
        telemetryClientMock,
        anyParam,
        anyParam,
        anyParam
      )
    ).resolves.toEqual(
      expect.objectContaining({
        kind: "PERMANENT"
      })
    );
    expect(telemetryClientMock.trackException).toHaveBeenCalled();
  });

  test("shoud return a Permanent failure if input is not retriable", async () => {
    await expect(
      HandleMessageViewUpdateFailureHandler(
        functionsContextMock,
        aNotRetriableInput,
        telemetryClientMock,
        anyParam,
        anyParam,
        anyParam
      )
    ).resolves.toEqual(
      expect.objectContaining({
        kind: "PERMANENT"
      })
    );
    expect(telemetryClientMock.trackException).toHaveBeenCalled();
  });

  test("shoud return a Permanent failure if handleStatusChange returns a Permanent Failure", async () => {
    handleStatusChangeMock.mockImplementationOnce(() =>
      TE.left({ ...aTransientFailure, kind: "PERMANENT" })
    );
    await expect(
      HandleMessageViewUpdateFailureHandler(
        functionsContextMock,
        aNotRetriableInput,
        telemetryClientMock,
        anyParam,
        anyParam,
        anyParam
      )
    ).resolves.toEqual(
      expect.objectContaining({
        kind: "PERMANENT"
      })
    );
    expect(telemetryClientMock.trackException).toHaveBeenCalled();
  });
});
