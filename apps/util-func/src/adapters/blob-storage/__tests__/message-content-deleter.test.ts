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
  logger,
);

const messageId = "01JP800CXX3ZM82SZNPFAQW7VS";

describe("BlobMessageContentDeleter.deleteMessageContent", () => {
  test("should log a success if message content was deleted successfully", async () => {
    await blobMessageContentDeleter.deleteMessageContent(messageId);

    expect(containerClient.getBlobClient).toHaveBeenCalledWith(
      `${messageId}.json`,
    );
    expect(logger.info).toHaveBeenCalledWith(
      `Message content of message with id ${messageId} deleted successfully`,
    );
  });

  test("should log an error if deletion fails", async () => {
    deleteIfExistsMock.mockResolvedValueOnce({
      errorCode: "Error",
      succeeded: false,
    });

    await blobMessageContentDeleter.deleteMessageContent(messageId);

    expect(logger.error).toHaveBeenCalledWith(
      `Failed to delete message content for message ${messageId} | Error code: Error`,
    );
  });

  test("should log an error if an exception is thrown", async () => {
    deleteIfExistsMock.mockRejectedValue(new Error("Exception"));

    await blobMessageContentDeleter.deleteMessageContent(messageId);

    expect(logger.error).toHaveBeenCalledWith(
      `Failed to delete message content for message ${messageId} | Error: Error: Exception`,
    );
  });
});
