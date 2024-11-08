import {
  aSimpleMessage,
  aSimpleMessageContent,
  aSimpleMessageMetadata,
} from "@/__mocks__/message.js";
import { Message, messageEventSchema } from "@/domain/message.js";
import { Logger } from "pino";
import { describe, expect, test, vi } from "vitest";

import { MessageContentError } from "../blob-storage/message-content.js";
import { MessageAdapter, MessageContentProvider } from "../message.js";

const errorLogMock = vi.fn();
const warnLogMock = vi.fn();

const loggerMock = {
  error: errorLogMock,
  warn: warnLogMock,
} as unknown as Logger;

const getByMessageId = vi.fn();

const messageContentMock: MessageContentProvider = {
  getByMessageId,
};

const messageAdapter = new MessageAdapter(messageContentMock, loggerMock);

describe("getMessageByMetadata", () => {
  test("Given a message metadata, when the BlobMessageContent return a MessageContent, then it should return a Message", async () => {
    getByMessageId.mockResolvedValueOnce(aSimpleMessageContent);
    const r = await messageAdapter.getMessageByMetadata(aSimpleMessageMetadata);
    expect(r).toBeInstanceOf(Message);
  });

  test("Given a message metadata, when the BlobMessageContent return a MessageContentError, then it should return undefined", async () => {
    getByMessageId.mockRejectedValueOnce(
      new MessageContentError(new Error("test case")),
    );
    const r = await messageAdapter.getMessageByMetadata(aSimpleMessageMetadata);
    expect(r).toBe(undefined);
    expect(errorLogMock).toHaveBeenCalledTimes(1);
  });

  test("Given a message metadata, when the BlobMessageContent throws an error a retriable error, then it should throw it", async () => {
    getByMessageId.mockRejectedValueOnce({});
    await expect(() =>
      messageAdapter.getMessageByMetadata(aSimpleMessageMetadata),
    ).rejects.toThrowError();
  });
});

describe("transformMessage", () => {
  test("Given a valid message, when the isPending property is defined, then it should return the schema without calling the logger", () => {
    expect(
      messageEventSchema.safeParse(
        messageAdapter.transformMessage(aSimpleMessage),
      ).success,
    ).toBe(true);
    expect(warnLogMock).not.toHaveBeenCalled();
  });

  test("Given a valid message, when the isPending property is not defined, then it should return the schema calling the logger", () => {
    expect(
      messageEventSchema.safeParse(
        messageAdapter.transformMessage({
          ...aSimpleMessage,
          contentType: "GENERIC",
          metadata: { ...aSimpleMessage.metadata, isPending: undefined },
        }),
      ).success,
    ).toBe(true);
    expect(warnLogMock).toHaveBeenCalledTimes(1);
  });
});
