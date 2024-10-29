import { aSimpleMessageEvent } from "@/__mocks__/message-event.js";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { EventProducer } from "../event-producer.js";

const mocks = vi.hoisted(() => ({
  EventHubProducerClient: vi.fn().mockImplementation(() => ({
    createBatch: () => ({
      tryAdd: tryAddMock,
    }),
    sendBatch: sendBatchMock,
  })),
}));

vi.mock("@azure/event-hubs", async (importOriginal) => {
  const original = await importOriginal<typeof import("@azure/storage-blob")>();
  return {
    ...original,
    EventHubProducerClient: mocks.EventHubProducerClient,
  };
});

const tryAddMock = vi.fn(() => true);
const sendBatchMock = vi.fn(() => Promise.resolve());

const eventHubProducerClient = new mocks.EventHubProducerClient();

const eventProducer = new EventProducer(eventHubProducerClient);

describe("publishMessage", () => {
  beforeEach(() => {
    tryAddMock.mockClear();
    tryAddMock.mockImplementation(() => true);
    sendBatchMock.mockClear();
    sendBatchMock.mockImplementation(() => Promise.resolve());
  });
  test("Given a valid message event it should resolve", async () => {
    await expect(
      eventProducer.publishMessage(
        Buffer.from(JSON.stringify(aSimpleMessageEvent)),
      ),
    ).resolves.toEqual(undefined);
    expect(tryAddMock).toHaveBeenCalledOnce();
    expect(sendBatchMock).toHaveBeenCalledOnce();
  });

  test("Should throw an error if tryAddMock returns false", async () => {
    tryAddMock.mockImplementation(() => false);
    await expect(
      eventProducer.publishMessage(
        Buffer.from(JSON.stringify(aSimpleMessageEvent)),
      ),
    ).rejects.toEqual(
      new Error("Error while sending the event to the eventhub"),
    );
    expect(tryAddMock).toHaveBeenCalledOnce();
    expect(tryAddMock).toHaveReturnedWith(false);
    expect(sendBatchMock).not.toHaveBeenCalledOnce();
  });

  test("Should throw an error if sendBatchMock rejects", async () => {
    sendBatchMock.mockImplementation(() => Promise.reject());
    await expect(
      eventProducer.publishMessage(
        Buffer.from(JSON.stringify(aSimpleMessageEvent)),
      ),
    ).rejects.toEqual(
      new Error("Error while sending the event to the eventhub"),
    );
    expect(tryAddMock).toHaveBeenCalledOnce();
    expect(tryAddMock).toHaveReturnedWith(true);
    expect(sendBatchMock).toHaveBeenCalledOnce();
  });
});
