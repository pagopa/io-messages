import {
  aMaskedFiscalCode,
  aSimpleMessage,
  aSimpleMessageContent,
  aSimpleMessageMetadata,
} from "@/__mocks__/message.js";
import {
  messageEventSchema,
  transformMessageToMessageEvent,
} from "@/domain/message-event.js";
import { TokenizerClient } from "@/domain/tokenizer.js";
import { Logger } from "pino";
import { Mocked, afterEach, describe, expect, test, vi } from "vitest";

import { ApplicationInsights } from "../appinsights/appinsights.js";
import {
  MessageContentError,
  MessageContentProvider,
} from "../blob-storage/message-content.js";
import { MessageAdapter } from "../message.js";
import { EventErrorTableStorage } from "../table-storage/event-error-table-storage.js";

const mocks = vi.hoisted(() => ({
  TableClient: vi.fn().mockImplementation(() => ({
    createEntity: createEntity,
  })),
  TelemetryClient: vi.fn().mockImplementation(() => ({
    trackEvent: trackEventMock,
  })),
}));
const createEntity = vi.fn(() => Promise.resolve());
const trackEventMock = vi.fn(() => Promise.resolve());

const errorLogMock = vi.fn();
const warnLogMock = vi.fn();

const loggerMock = {
  error: errorLogMock,
  warn: warnLogMock,
} as unknown as Logger;

vi.mock("@azure/data-tables", async (importOriginal) => {
  const original = await importOriginal<typeof import("@azure/data-tables")>();
  return {
    ...original,
    TableClient: mocks.TableClient,
  };
});

const telemetryClient = new mocks.TelemetryClient();
const telemetryServiceMock = new ApplicationInsights(telemetryClient);
const telemetryTrackEventMock = vi
  .spyOn(telemetryServiceMock, "trackEvent")
  .mockResolvedValue();

const getByMessageContentById = vi.fn();

const messageContentMock: MessageContentProvider = {
  getByMessageContentById,
};

const messageIngestionErrorTableClientMock = new mocks.TableClient();
const messageIngestionErrorRepositoryMock = new EventErrorTableStorage(
  messageIngestionErrorTableClientMock,
);

const eventErrorRepoPushSpy = vi
  .spyOn(messageIngestionErrorRepositoryMock, "push")
  .mockResolvedValue();

const messageAdapter = new MessageAdapter(
  messageContentMock,
  messageIngestionErrorRepositoryMock,
  telemetryServiceMock,
  loggerMock,
);

const tokenizerClient: Mocked<TokenizerClient> = {
  maskSensitiveInfo: vi
    .fn()
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    .mockImplementation(async (_fiscalCode) => aMaskedFiscalCode),
};

describe("getMessageByMetadata", () => {
  afterEach(() => {
    eventErrorRepoPushSpy.mockClear();
    telemetryTrackEventMock.mockClear();
  });

  test("Given a message metadata, when the BlobMessageContent return a MessageContent, then it should return a Message", async () => {
    getByMessageContentById.mockResolvedValueOnce(aSimpleMessageContent);
    const message = await messageAdapter.getMessageByMetadata(
      aSimpleMessageMetadata,
    );
    expect(message).toEqual(aSimpleMessage);
    expect(eventErrorRepoPushSpy).not.toHaveBeenCalled();
    expect(telemetryTrackEventMock).not.toHaveBeenCalled();
  });

  test("Given a message metadata, when the BlobMessageContent return a MessageContentError, then it should return undefined", async () => {
    getByMessageContentById.mockRejectedValueOnce(
      new MessageContentError(new Error("test case")),
    );
    const r = await messageAdapter.getMessageByMetadata(aSimpleMessageMetadata);
    expect(r).toBe(undefined);
    expect(errorLogMock).toHaveBeenCalledTimes(1);
    expect(eventErrorRepoPushSpy).toHaveBeenCalledWith();
    expect(telemetryTrackEventMock).toHaveBeenCalledWith();
  });

  test("Given a message metadata, when the BlobMessageContent throws an error a retriable error, then it should throw it", async () => {
    getByMessageContentById.mockRejectedValueOnce({});
    await expect(() =>
      messageAdapter.getMessageByMetadata(aSimpleMessageMetadata),
    ).rejects.toThrowError();
    expect(eventErrorRepoPushSpy).not.toHaveBeenCalled();
    expect(telemetryTrackEventMock).not.toHaveBeenCalled();
  });
});

describe("getMessageEventFromMessage", () => {
  afterEach(() => {
    telemetryTrackEventMock.mockClear();
    eventErrorRepoPushSpy.mockClear();
  });

  test("Given a valid message, when tokenize works, then it should return the message event", async () => {
    expect(
      messageEventSchema.safeParse(
        await transformMessageToMessageEvent(aSimpleMessage, tokenizerClient),
      ).success,
    ).toBe(true);
    expect(eventErrorRepoPushSpy).not.toHaveBeenCalled();
    expect(telemetryTrackEventMock).not.toHaveBeenCalled();
  });

  test("Given a valid message, when the tokenize does not works, then it should throw an error", async () => {
    tokenizerClient.maskSensitiveInfo.mockImplementationOnce(() => {
      throw new Error("Error calling the tokenize");
    });
    await expect(
      transformMessageToMessageEvent(aSimpleMessage, tokenizerClient),
    ).rejects.toThrowError("Error calling the tokenize");
    expect(eventErrorRepoPushSpy).not.toHaveBeenCalled();
    expect(telemetryTrackEventMock).not.toHaveBeenCalled();
  });
});
