import { aSimpleMessageEvent } from "@/__mocks__/message-event.js";
import { MessageEvent } from "@/domain/message.js";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { messageSchema } from "../avro.js";
import { EventHubEventProducer } from "../message-event.js";

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

const messageEventAdapter = new EventHubEventProducer<MessageEvent>(
  eventHubProducerClient,
  messageSchema,
);
const aSimpleMessageEventArray: MessageEvent[] = [aSimpleMessageEvent];
describe("publishMessageEvent", () => {
  beforeEach(() => {
    tryAddMock.mockRestore();
    sendBatchMock.mockRestore();
  });
  test("Given a valid message event it should resolve", async () => {
    await expect(
      messageEventAdapter.publish(aSimpleMessageEventArray),
    ).resolves.toEqual(undefined);
    expect(tryAddMock).toHaveBeenCalledOnce();
    expect(sendBatchMock).toHaveBeenCalledOnce();
  });

  test("Should throw an error if tryAddMock returns false", async () => {
    tryAddMock.mockImplementation(() => false);
    await expect(
      messageEventAdapter.publish(aSimpleMessageEventArray),
    ).rejects.toEqual(new Error("Error while adding event to the batch"));
    expect(tryAddMock).toHaveBeenCalledOnce();
    expect(tryAddMock).toHaveReturnedWith(false);
    expect(sendBatchMock).not.toHaveBeenCalledOnce();
  });

  test("Should throw an error if sendBatchMock rejects", async () => {
    sendBatchMock.mockImplementation(() => Promise.reject());
    await expect(
      messageEventAdapter.publish(aSimpleMessageEventArray),
    ).rejects.toEqual(undefined);
    expect(tryAddMock).toHaveBeenCalledOnce();
    expect(tryAddMock).toHaveReturnedWith(true);
    expect(sendBatchMock).toHaveBeenCalledOnce();
  });
});
