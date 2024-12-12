import {
  aSimpleMessage,
  aSimpleMessageContent,
  aSimpleMessageMetadata,
} from "@/__mocks__/message.js";
import { messageSchema } from "@/adapters/avro.js";
import { MessageAdapter, MessageContentProvider } from "@/adapters/message.js";
import { EventHubEventProducer } from "@/adapters/message-event.js";
import PDVTokenizerClient from "@/adapters/pdv-tokenizer/pdv-tokenizer-client.js";
import { InvocationContext } from "@azure/functions";
import { pino } from "pino";
import { afterEach, describe, expect, test, vi } from "vitest";

import messagesIngestion from "../messages-ingestion.js";

const logger = pino();
const mocks = vi.hoisted(() => ({
  EventHubProducerClient: vi.fn().mockImplementation(() => ({
    createBatch: () => ({
      tryAdd: tryAddMock,
    }),
    sendBatch: sendBatchMock,
  })),
}));

const tryAddMock = vi.fn(() => true);
const sendBatchMock = vi.fn(() => Promise.resolve());

vi.mock("@azure/event-hubs", async (importOriginal) => {
  const original = await importOriginal<typeof import("@azure/storage-blob")>();
  return {
    ...original,
    EventHubProducerClient: mocks.EventHubProducerClient,
  };
});

const messageContentMock: MessageContentProvider = {
  getByMessageId: vi.fn(),
};
const messageAdapter = new MessageAdapter(messageContentMock, logger);
const getMessageByMetadataSpy = vi
  .spyOn(messageAdapter, "getMessageByMetadata")
  .mockResolvedValue(aSimpleMessage);

const PDVTokenizer = new PDVTokenizerClient("testApiKey", "testBaseUri");
const tokenizeSpy = vi
  .spyOn(PDVTokenizer, "tokenize")
  .mockResolvedValue("9314a1ea-ac0b-11ef-9cd2-0242ac120002");

const eventHubProducerClient = new mocks.EventHubProducerClient();
const producer = new EventHubEventProducer(
  eventHubProducerClient,
  messageSchema,
);
const publishSpy = vi.spyOn(producer, "publish").mockResolvedValue();

const context = new InvocationContext();
const handler = messagesIngestion(messageAdapter, PDVTokenizer, producer);

describe("messagesIngestion handler", () => {
  afterEach(() => {
    getMessageByMetadataSpy.mockClear();
    tokenizeSpy.mockClear();
    publishSpy.mockClear();
  });
  test("shoud resolve if nothing throws", async () => {
    const documentsMock = [aSimpleMessageMetadata];
    await expect(handler(documentsMock, context)).resolves.toEqual(undefined);
    expect(getMessageByMetadataSpy).toHaveBeenCalledOnce();
    expect(tokenizeSpy).toHaveBeenCalledOnce();
    expect(publishSpy).toHaveBeenCalledOnce();
  });

  test("shoud call multiple times the business logic function if documents are more than one", async () => {
    const documentsMock = [aSimpleMessageMetadata, aSimpleMessageMetadata];
    await expect(handler(documentsMock, context)).resolves.toEqual(undefined);
    expect(getMessageByMetadataSpy).toHaveBeenCalledTimes(2);
    expect(tokenizeSpy).toHaveBeenCalledTimes(2);
    expect(publishSpy).toHaveBeenCalledOnce();
  });

  test("shoud resolve if the documents array has malformed objects", async () => {
    const documentsMock = [aSimpleMessageMetadata, aSimpleMessageContent];
    await expect(handler(documentsMock, context)).resolves.toEqual(undefined);
    expect(getMessageByMetadataSpy).toHaveBeenCalledOnce();
    expect(tokenizeSpy).toHaveBeenCalledOnce();
    expect(publishSpy).toHaveBeenCalledOnce();
  });

  test("should not call any function if the documents array is empty", async () => {
    const documentsMock: unknown[] = [];
    await expect(handler(documentsMock, context)).resolves.toEqual(undefined);
    expect(getMessageByMetadataSpy).not.toHaveBeenCalledOnce();
    expect(tokenizeSpy).not.toHaveBeenCalledOnce();
    expect(publishSpy).not.toHaveBeenCalledOnce();
  });

  test("should throw an error if tokenize throws an error", async () => {
    const documentsMock = [aSimpleMessageMetadata];
    tokenizeSpy.mockRejectedValueOnce(false);
    await expect(handler(documentsMock, context)).rejects.toEqual(false);
    expect(getMessageByMetadataSpy).toHaveBeenCalledOnce();
    expect(tokenizeSpy).toHaveBeenCalledOnce();
    expect(publishSpy).not.toHaveBeenCalledOnce();
  });

  test("should resolve calling tokenize and getMessageByMetadata onfly for documents with isPending = false", async () => {
    const documentsMock = [
      aSimpleMessageMetadata,
      { ...aSimpleMessageMetadata, isPending: true },
    ];
    await expect(handler(documentsMock, context)).resolves.toEqual(undefined);
    expect(getMessageByMetadataSpy).toHaveBeenCalledOnce();
    expect(tokenizeSpy).toHaveBeenCalledOnce();
    expect(publishSpy).toHaveBeenCalledOnce();
  });
});
