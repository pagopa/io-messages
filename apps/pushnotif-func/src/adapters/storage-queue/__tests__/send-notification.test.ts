import { QueueClient } from "@azure/storage-queue";
import { afterEach, describe, expect, test, vi } from "vitest";

import { ErrorInternal } from "../../../domain/error";
import { SendNotificationMessage } from "../../../domain/send-notification";
import { SendNotificationQueueAdapter } from "../send-notification";

const queueClientMock: Pick<QueueClient, "sendMessage"> = {
  sendMessage: vi.fn(),
};

const adapter = new SendNotificationQueueAdapter(
  queueClientMock as QueueClient,
);

const aSendNotificationMessage: SendNotificationMessage = {
  jobId: "01ARZ3NDEKTSV4RRFFQ69G5FAV",
  scheduledTimestamp: 1700000100,
  tags: ["aaa", "bbb"],
};

describe("SendNotificationQueueAdapter", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  test("should send a base64-encoded notification payload and return message id", async () => {
    vi.mocked(queueClientMock.sendMessage).mockResolvedValueOnce({
      messageId: "message-id-123",
    } as Awaited<ReturnType<QueueClient["sendMessage"]>>);

    const result = await adapter.sendMessage(aSendNotificationMessage);

    const expectedPayload = Buffer.from(
      JSON.stringify(aSendNotificationMessage),
    ).toString("base64");

    expect(queueClientMock.sendMessage).toHaveBeenCalledWith(expectedPayload);
    expect(result).toBe("message-id-123");
  });

  test("should return ErrorInternal when queue client throws", async () => {
    const queueError = new Error("queue unavailable");
    vi.mocked(queueClientMock.sendMessage).mockRejectedValueOnce(queueError);

    const result = await adapter.sendMessage(aSendNotificationMessage);

    expect(result).toBeInstanceOf(ErrorInternal);
    expect(result).toMatchObject({
      cause: queueError,
      message: "Failed to send message to check job queue",
    });
  });
});
