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
import { Mocked, describe, expect, test, vi } from "vitest";

import {
  MessageContentError,
  MessageContentProvider,
} from "../blob-storage/message-content.js";
import { MessageAdapter } from "../message.js";

const errorLogMock = vi.fn();
const warnLogMock = vi.fn();

const loggerMock = {
  error: errorLogMock,
  warn: warnLogMock,
} as unknown as Logger;

const getByMessageContentById = vi.fn();

const messageContentMock: MessageContentProvider = {
  getByMessageContentById,
};

const messageAdapter = new MessageAdapter(messageContentMock, loggerMock);

const tokenizerClient: Mocked<TokenizerClient> = {
  maskSensitiveInfo: vi
    .fn()
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    .mockImplementation(async (_fiscalCode) => aMaskedFiscalCode),
};

describe("getMessageByMetadata", () => {
  test("Given a message metadata, when the BlobMessageContent return a MessageContent, then it should return a Message", async () => {
    getByMessageContentById.mockResolvedValueOnce(aSimpleMessageContent);
    const message = await messageAdapter.getMessageByMetadata(
      aSimpleMessageMetadata,
    );
    expect(message).toEqual(aSimpleMessage);
  });

  test("Given a message metadata, when the BlobMessageContent return a MessageContentError, then it should return undefined", async () => {
    getByMessageContentById.mockRejectedValueOnce(
      new MessageContentError(new Error("test case")),
    );
    const r = await messageAdapter.getMessageByMetadata(aSimpleMessageMetadata);
    expect(r).toBe(undefined);
    expect(errorLogMock).toHaveBeenCalledTimes(1);
  });

  test("Given a message metadata, when the BlobMessageContent throws an error a retriable error, then it should throw it", async () => {
    getByMessageContentById.mockRejectedValueOnce({});
    await expect(() =>
      messageAdapter.getMessageByMetadata(aSimpleMessageMetadata),
    ).rejects.toThrowError();
  });
});

describe("getMessageEventFromMessage", () => {
  test("Given a valid message, when tokenize works, then it should return the message event", async () => {
    expect(
      messageEventSchema.safeParse(
        await transformMessageToMessageEvent(aSimpleMessage, tokenizerClient),
      ).success,
    ).toBe(true);
  });

  test("Given a valid message, when the tokenize does not works, then it should throw an error", async () => {
    tokenizerClient.maskSensitiveInfo.mockImplementationOnce(() => {
      throw new Error("Error calling the tokenize");
    });
    await expect(
      transformMessageToMessageEvent(aSimpleMessage, tokenizerClient),
    ).rejects.toThrowError("Error calling the tokenize");
  });
});
