import {
  aSimpleMessage,
  aSimpleMessageContent,
  aSimpleMessageMetadata,
} from "@/__mocks__/message.js";
import { messageSchema } from "@/adapters/avro.js";
import { MessageContentProvider } from "@/adapters/blob-storage/message-content.js";
import { EventHubEventProducer } from "@/adapters/eventhub/event.js";
import { MessageAdapter } from "@/adapters/message.js";
import PDVTokenizerClient from "@/adapters/tokenizer/pdv-tokenizer-client.js";
import { IngestMessageUseCase } from "@/domain/use-cases/ingest-message.js";
import { InvocationContext } from "@azure/functions";
import { pino } from "pino";
import { afterEach, describe, expect, test, vi } from "vitest";

import messagesIngestion from "../message-ingestion-error-queue.js";

const logger = pino({});

const mocks = vi.hoisted(() => ({
  EventErrorRepository: vi.fn().mockImplementation(() => ({
    push: vi.fn(),
  })),
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
  getByMessageContentById: vi.fn(),
};
const messageAdapter = new MessageAdapter(messageContentMock, logger);
const getMessageByMetadataSpy = vi
  .spyOn(messageAdapter, "getMessageByMetadata")
  .mockResolvedValue(aSimpleMessage);

const PDVTokenizer = new PDVTokenizerClient("testApiKey", "testBaseUri");
const tokenizeSpy = vi
  .spyOn(PDVTokenizer, "maskSensitiveInfo")
  .mockResolvedValue("9314a1ea-ac0b-11ef-9cd2-0242ac120002");

const eventHubProducerClient = new mocks.EventHubProducerClient();
const producer = new EventHubEventProducer(
  eventHubProducerClient,
  messageSchema,
);

const publishSpy = vi.spyOn(producer, "publish").mockResolvedValue();

const ingestMessageUseCase = new IngestMessageUseCase(
  messageAdapter,
  PDVTokenizer,
  producer,
);

const context = new InvocationContext();
const handler = messagesIngestion(ingestMessageUseCase);

describe("messagesIngestion handler", () => {
  afterEach(() => {
    getMessageByMetadataSpy.mockClear();
    tokenizeSpy.mockClear();
    publishSpy.mockClear();
  });
  test("shoud resolve if nothing throws", async () => {
    const documentsMock = aSimpleMessageMetadata;
    await expect(handler(documentsMock, context)).resolves.toEqual(undefined);
    expect(getMessageByMetadataSpy).toHaveBeenCalledOnce();
    expect(tokenizeSpy).toHaveBeenCalledOnce();
    expect(publishSpy).toHaveBeenCalledOnce();
  });

  test("shoud resolve if the documents array has malformed objects", async () => {
    //using Message Contect instead of Message Metadata for a parsing error
    const documentsMock = aSimpleMessageContent;
    await expect(handler(documentsMock, context)).resolves.toEqual(undefined);
    expect(getMessageByMetadataSpy).not.toHaveBeenCalledOnce();
    expect(tokenizeSpy).not.toHaveBeenCalledOnce();
    expect(publishSpy).not.toHaveBeenCalledOnce();
  });

  test("should throw an error if tokenize throws an error", async () => {
    const documentsMock = aSimpleMessageMetadata;
    tokenizeSpy.mockRejectedValueOnce(false);
    await expect(handler(documentsMock, context)).rejects.toEqual(false);
    expect(getMessageByMetadataSpy).toHaveBeenCalledOnce();
    expect(tokenizeSpy).toHaveBeenCalledOnce();
    expect(publishSpy).not.toHaveBeenCalledOnce();
  });

  test("should resolve not calling tokenize and getMessageByMetadata if the document hash isPending true", async () => {
    const documentsMock = { ...aSimpleMessageMetadata, isPending: true };
    await expect(handler(documentsMock, context)).resolves.toEqual(undefined);
    expect(getMessageByMetadataSpy).not.toHaveBeenCalledOnce();
    expect(tokenizeSpy).not.toHaveBeenCalledOnce();
    expect(publishSpy).not.toHaveBeenCalledOnce();
  });
});
