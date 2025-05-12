import {
  aSimpleMessage,
  aSimpleMessageContent,
  aSimpleMessageMetadata,
} from "@/__mocks__/message.js";
import { TelemetryEventService } from "@/adapters/appinsights/appinsights.js";
import { messageSchema } from "@/adapters/avro.js";
import { MessageContentProvider } from "@/adapters/blob-storage/message-content.js";
import { EventHubEventProducer } from "@/adapters/eventhub/event.js";
import { MessageAdapter } from "@/adapters/message.js";
import { EventErrorTableStorage } from "@/adapters/table-storage/event-error-table-storage.js";
import PDVTokenizerClient from "@/adapters/tokenizer/pdv-tokenizer-client.js";
import { IngestMessageUseCase } from "@/domain/use-cases/ingest-message.js";
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
  TableClient: vi.fn().mockImplementation(() => ({
    createEntity: createEntity,
  })),
  TelemetryClient: vi.fn().mockImplementation(() => ({
    trackEvent: vi.fn(),
  })),
}));

const tryAddMock = vi.fn(() => true);
const sendBatchMock = vi.fn(() => Promise.resolve());
const createEntity = vi.fn(() => Promise.resolve());

vi.mock("@azure/event-hubs", async (importOriginal) => {
  const original = await importOriginal<typeof import("@azure/event-hubs")>();
  return {
    ...original,
    EventHubProducerClient: mocks.EventHubProducerClient,
  };
});

vi.mock("@azure/data-tables", async (importOriginal) => {
  const original = await importOriginal<typeof import("@azure/data-tables")>();
  return {
    ...original,
    TableClient: mocks.TableClient,
  };
});

const telemetryClient = new mocks.TelemetryClient();
const telemetryServiceMock = new TelemetryEventService(telemetryClient);
const telemetryTrackEventMock = vi
  .spyOn(telemetryServiceMock, "trackEvent")
  .mockResolvedValue();

const messageContentMock: MessageContentProvider = {
  getByMessageContentById: vi.fn(),
};

const messageIngestionErrorTableClientMock = new mocks.TableClient();
const messageIngestionErrorRepositoryMock = new EventErrorTableStorage(
  messageIngestionErrorTableClientMock,
);

const messageAdapter = new MessageAdapter(
  messageContentMock,
  messageIngestionErrorRepositoryMock,
  telemetryServiceMock,
  logger,
);
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

const eventErrorRepoPushSpy = vi
  .spyOn(messageIngestionErrorRepositoryMock, "push")
  .mockResolvedValue();

const ingestMessageUseCase = new IngestMessageUseCase(
  messageAdapter,
  PDVTokenizer,
  producer,
);

const context = new InvocationContext();
const handler = messagesIngestion(
  ingestMessageUseCase,
  messageIngestionErrorRepositoryMock,
  telemetryServiceMock,
);

describe("messagesIngestion handler", () => {
  afterEach(() => {
    getMessageByMetadataSpy.mockClear();
    tokenizeSpy.mockClear();
    publishSpy.mockClear();
    eventErrorRepoPushSpy.mockClear();
    telemetryTrackEventMock.mockClear();
    context.retryContext = { maxRetryCount: 1, retryCount: 1 };
  });

  test("shoud resolve if nothing throws", async () => {
    const documentsMock = [aSimpleMessageMetadata];
    await expect(handler(documentsMock, context)).resolves.toEqual(undefined);
    expect(getMessageByMetadataSpy).toHaveBeenCalledOnce();
    expect(tokenizeSpy).toHaveBeenCalledOnce();
    expect(publishSpy).toHaveBeenCalledOnce();
    expect(eventErrorRepoPushSpy).not.toHaveBeenCalled();
    expect(telemetryTrackEventMock).not.toHaveBeenCalled();
  });

  test("shoud call multiple times the business logic function if documents are more than one", async () => {
    const documentsMock = [aSimpleMessageMetadata, aSimpleMessageMetadata];
    await expect(handler(documentsMock, context)).resolves.toEqual(undefined);
    expect(getMessageByMetadataSpy).toHaveBeenCalledTimes(2);
    expect(tokenizeSpy).toHaveBeenCalledTimes(2);
    expect(publishSpy).toHaveBeenCalledOnce();
    expect(eventErrorRepoPushSpy).not.toHaveBeenCalled();
    expect(telemetryTrackEventMock).not.toHaveBeenCalled();
  });

  test("shoud resolve if the documents array has malformed objects", async () => {
    const documentsMock = [aSimpleMessageMetadata, aSimpleMessageContent];
    await expect(handler(documentsMock, context)).resolves.toEqual(undefined);
    expect(getMessageByMetadataSpy).toHaveBeenCalledOnce();
    expect(tokenizeSpy).toHaveBeenCalledOnce();
    expect(publishSpy).toHaveBeenCalledOnce();
    expect(eventErrorRepoPushSpy).toHaveBeenCalledOnce();
    expect(telemetryTrackEventMock).toHaveBeenCalledOnce();
  });

  test("should not call any function if the documents array is empty", async () => {
    const documentsMock: unknown[] = [];
    await expect(handler(documentsMock, context)).resolves.toEqual(undefined);
    expect(getMessageByMetadataSpy).not.toHaveBeenCalledOnce();
    expect(tokenizeSpy).not.toHaveBeenCalledOnce();
    expect(publishSpy).not.toHaveBeenCalledOnce();
    expect(eventErrorRepoPushSpy).not.toHaveBeenCalled();
    expect(telemetryTrackEventMock).not.toHaveBeenCalled();
  });

  test("should throw an error if tokenize throws an error", async () => {
    const documentsMock = [aSimpleMessageMetadata];
    tokenizeSpy.mockRejectedValueOnce(false);
    await expect(handler(documentsMock, context)).rejects.toEqual(false);
    expect(getMessageByMetadataSpy).toHaveBeenCalledOnce();
    expect(tokenizeSpy).toHaveBeenCalledOnce();
    expect(publishSpy).not.toHaveBeenCalledOnce();
    expect(eventErrorRepoPushSpy).toHaveBeenCalledOnce();
    expect(telemetryTrackEventMock).toHaveBeenCalledOnce();
  });

  test("should not call eventErrorRepository if retry context are less than maxRetry context", async () => {
    const documentsMock = [aSimpleMessageMetadata];
    tokenizeSpy.mockRejectedValueOnce(false);
    context.retryContext = { maxRetryCount: 5, retryCount: 1 };
    await expect(handler(documentsMock, context)).rejects.toEqual(false);
    expect(getMessageByMetadataSpy).toHaveBeenCalledOnce();
    expect(tokenizeSpy).toHaveBeenCalledOnce();
    expect(publishSpy).not.toHaveBeenCalledOnce();
    expect(eventErrorRepoPushSpy).not.toHaveBeenCalledOnce();
    expect(telemetryTrackEventMock).not.toHaveBeenCalled();
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
    expect(eventErrorRepoPushSpy).not.toHaveBeenCalled();
    expect(telemetryTrackEventMock).not.toHaveBeenCalled();
  });
});
