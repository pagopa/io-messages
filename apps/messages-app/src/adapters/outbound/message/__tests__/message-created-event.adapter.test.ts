import { QueueClient } from "@azure/storage-queue";
import { GenericError } from "@pagopa/hexagonal-core";
import { describe, expect, it, vi } from "vitest";

import { MessageCreatedEvent } from "../../../../application/ports/message-created-event.js";
import { MessageCreatedEventQueueAdapter } from "../message-created-event.adapter.js";

const aMessageCreatedEvent: MessageCreatedEvent = {
  defaultAddresses: {},
  messageId: "01ARZ3NDEKTSV4RRFFQ69G5FAV",
};

const queueClient = new QueueClient(
  "https://fake.queue.core.windows.net/message-created",
);
const sendMessageMock = vi.spyOn(queueClient, "sendMessage");
const adapter = new MessageCreatedEventQueueAdapter(queueClient);

describe("MessageCreatedEventQueueAdapter", () => {
  it("publishes the created message event as base64-encoded JSON", async () => {
    sendMessageMock.mockResolvedValueOnce({
      messageId: "queue-message-id",
    } as Awaited<ReturnType<QueueClient["sendMessage"]>>);

    const result = await adapter.publish(aMessageCreatedEvent);
    const encodedEvent = Buffer.from(
      JSON.stringify(aMessageCreatedEvent),
    ).toString("base64");

    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap()).toBeUndefined();
    expect(sendMessageMock).toHaveBeenCalledWith(encodedEvent);
  });

  it("returns GenericError when publishing fails", async () => {
    sendMessageMock.mockRejectedValueOnce(new Error("queue unavailable"));

    const result = await adapter.publish(aMessageCreatedEvent);

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(GenericError);
    expect(result._unsafeUnwrapErr().message).toContain(
      aMessageCreatedEvent.messageId,
    );
    expect(result._unsafeUnwrapErr().message).toContain("queue unavailable");
  });

  it("returns GenericError for non-Error publishing failures", async () => {
    sendMessageMock.mockRejectedValueOnce("unexpected failure");

    const result = await adapter.publish(aMessageCreatedEvent);

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(GenericError);
    expect(result._unsafeUnwrapErr().message).toContain("unexpected failure");
  });
});
