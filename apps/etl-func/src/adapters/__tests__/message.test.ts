import {
  aMaskedFiscalCode,
  aSimpleMessage,
  aSimpleMessageContent,
  aSimpleMessageMetadata,
} from "@/__mocks__/message.js";
import {
  RecipientRepository,
  TokenizerClient,
} from "@/domain/interfaces/tokenizer.js";
import { MaskFiscalCodeUseCase } from "@/domain/mask-fiscal-code.js";
import { Message, messageEventSchema } from "@/domain/message.js";
import { Logger } from "pino";
import { Mocked, describe, expect, test, vi } from "vitest";

import { MessageContentError } from "../blob-storage/message-content.js";
import {
  MessageAdapter,
  MessageContentProvider,
  getMessageEventFromMessage,
} from "../message.js";

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

const recipientStore = new Map<string, unknown>();

const tokenizerClient: Mocked<TokenizerClient> = {
  tokenize: vi
    .fn()
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    .mockImplementation(async (_fiscalCode) => aMaskedFiscalCode),
};

const recipientRepository: Mocked<RecipientRepository> = {
  get: vi
    .fn()
    .mockImplementation(async (fiscalCode) =>
      recipientStore.get(`user:${fiscalCode.toLowerCase()}:recipient.id`),
    ),
  upsert: vi.fn().mockImplementation(async (fiscalCode) => {
    recipientStore.set(`user:${fiscalCode.toLowerCase()}:recipient.id`, event);
  }),
};

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

describe("getMessageEventFromMessage", () => {
  test("Given a valid message, when tokenize works, then it should return the message event", async () => {
    const maskFiscalCodeUseCase = new MaskFiscalCodeUseCase({
      recipientRepository,
      tokenizerClient,
    });
    expect(
      messageEventSchema.safeParse(
        await getMessageEventFromMessage(aSimpleMessage, maskFiscalCodeUseCase),
      ).success,
    ).toBe(true);
  });

  test("Given a valid message, when the tokenize does not works, then it should throw an error", async () => {
    tokenizerClient.tokenize.mockImplementationOnce(() => {
      throw new Error("Error calling the tokenize");
    });
    const maskFiscalCodeUseCase = new MaskFiscalCodeUseCase({
      recipientRepository,
      tokenizerClient,
    });
    await expect(
      getMessageEventFromMessage(aSimpleMessage, maskFiscalCodeUseCase),
    ).rejects.toThrowError("Error calling the tokenize");
  });
});
