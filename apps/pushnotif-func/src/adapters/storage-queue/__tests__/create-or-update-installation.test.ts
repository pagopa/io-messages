import { QueueClient } from "@azure/storage-queue";
import { afterEach, describe, expect, test, vi } from "vitest";

import { ErrorInternal } from "../../../domain/error";
import { CreateOrUpdateInstallationMessage } from "../../../generated/notifications/CreateOrUpdateInstallationMessage";
import { CreateOrUpdateInstallationQueueAdapter } from "../create-or-update-installation";

const queueClientMock: Pick<QueueClient, "sendMessage"> = {
  sendMessage: vi.fn(),
};
const adapter = new CreateOrUpdateInstallationQueueAdapter(
  queueClientMock as QueueClient,
);
const message: CreateOrUpdateInstallationMessage = {
  installationId:
    "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  kind: "CreateOrUpdateInstallation",
  platform: "apns",
  pushChannel: "push-channel",
  tags: ["e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"],
};

describe("CreateOrUpdateInstallationQueueAdapter", () => {
  afterEach(() => vi.clearAllMocks());

  test("enqueues a base64 message with a ten second visibility delay", async () => {
    vi.mocked(queueClientMock.sendMessage).mockResolvedValueOnce({
      messageId: "message-id",
    } as Awaited<ReturnType<QueueClient["sendMessage"]>>);

    await expect(adapter.createOrUpdateInstallation(message)).resolves.toBe(
      "message-id",
    );

    expect(queueClientMock.sendMessage).toHaveBeenCalledWith(
      Buffer.from(JSON.stringify(message)).toString("base64"),
      { visibilityTimeout: 10 },
    );
  });

  test("maps queue errors to ErrorInternal", async () => {
    vi.mocked(queueClientMock.sendMessage).mockRejectedValueOnce(
      new Error("queue unavailable"),
    );

    const result = await adapter.createOrUpdateInstallation(message);

    expect(result).toBeInstanceOf(ErrorInternal);
    expect(result).toMatchObject({
      message: "Failed to enqueue installation update",
    });
  });
});
