import { ContainerClient } from "@azure/storage-blob";
import { pino } from "pino";
import { describe, expect, test, vi } from "vitest";

import { BlobMessageContentDeleter } from "../message-content-deleter.js";

const logger = pino({ level: "silent" });
vi.spyOn(logger, "info");
vi.spyOn(logger, "error");

const deleteIfExistsMock = vi.fn().mockResolvedValue({ succeeded: true });
const getBlobClientMock = vi
  .fn()
  .mockReturnValue({ deleteIfExists: deleteIfExistsMock });

const containerClient = {
  getBlobClient: getBlobClientMock,
} as unknown as ContainerClient;

const blobMessageContentDeleter = new BlobMessageContentDeleter(
  containerClient,
);

const messageId = "01JP800CXX3ZM82SZNPFAQW7VS";

describe("BlobMessageContentDeleter.deleteMessageContent", () => {
  test("should return true if message content was deleted successfully", async () => {
    await expect(
      blobMessageContentDeleter.deleteMessageContent(messageId),
    ).resolves.toBe(true);

    expect(containerClient.getBlobClient).toHaveBeenCalledWith(
      `${messageId}.json`,
    );
  });

  test("should retrun false if deletion fails", async () => {
    deleteIfExistsMock.mockResolvedValueOnce({
      errorCode: "Error",
      succeeded: false,
    });

    await expect(
      blobMessageContentDeleter.deleteMessageContent(messageId),
    ).resolves.toBe(false);
  });

  test("should reject if an exception is thrown", async () => {
    deleteIfExistsMock.mockRejectedValue(new Error("Exception"));

    await expect(
      blobMessageContentDeleter.deleteMessageContent(messageId),
    ).rejects.toThrow(
      new Error(`Failed to delete message content for message ${messageId}`),
    );
  });
});
