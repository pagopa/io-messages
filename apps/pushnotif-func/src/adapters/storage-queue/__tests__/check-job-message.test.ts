import { QueueClient } from "@azure/storage-queue";
import { afterEach, describe, expect, test, vi } from "vitest";

import { CheckMassiveJobMessage } from "../../../domain/check-job-message";
import { ErrorInternal } from "../../../domain/error";
import { CheckMassiveJobQueueAdapter } from "../check-job-message";

const queueClientMock: Pick<QueueClient, "sendMessage"> = {
  sendMessage: vi.fn(),
};

const adapter = new CheckMassiveJobQueueAdapter(queueClientMock as QueueClient);

const aCheckJobMessage: CheckMassiveJobMessage = {
  jobId: "01ARZ3NDEKTSV4RRFFQ69G5FAV",
  timeToCheckInSeconds: 900,
};

describe("CheckJobMessageQueueAdapter", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  test("should send a base64-encoded check-job payload with visibility timeout and return message id", async () => {
    vi.mocked(queueClientMock.sendMessage).mockResolvedValueOnce({
      messageId: "message-id-123",
    } as Awaited<ReturnType<QueueClient["sendMessage"]>>);

    const result = await adapter.sendMessage(aCheckJobMessage);

    const expectedPayload = Buffer.from(
      JSON.stringify({ jobId: aCheckJobMessage.jobId }),
    ).toString("base64");

    expect(queueClientMock.sendMessage).toHaveBeenCalledWith(expectedPayload, {
      visibilityTimeout: aCheckJobMessage.timeToCheckInSeconds,
    });
    expect(result).toBe("message-id-123");
  });

  test("should return ErrorInternal when queue client throws", async () => {
    const queueError = new Error("queue unavailable");
    vi.mocked(queueClientMock.sendMessage).mockRejectedValueOnce(queueError);

    const result = await adapter.sendMessage(aCheckJobMessage);

    expect(result).toBeInstanceOf(ErrorInternal);
    expect(result).toMatchObject({
      message: "Failed to send message to check job queue",
    });
    expect((result as ErrorInternal).cause).toBe(JSON.stringify(queueError));
  });
});
