import { BlobMessageContentDeleter } from "@/adapters/blob-storage/message-content-deleter.js";
import { CosmosMessageMetadataDeleter } from "@/adapters/cosmos/message-metadata-deleter.js";
import { CosmosMessageStatusDeleter } from "@/adapters/cosmos/message-status-deleter.js";
import { ContainerClient } from "@azure/storage-blob";
import { pino } from "pino";
import { describe, expect, test, vi } from "vitest";

import { DeleteMessageUseCase } from "../delete-message.js";

const logger = pino({ level: "silent" });

vi.spyOn(logger, "info");

const deleteContentMock = vi.fn();
const deleteMessageMetadataMock = vi.fn().mockResolvedValue({ success: true });
const deleteMessageStatusesMock = vi.fn();

const uploadBlockBlobMock = vi.fn();

const blobMessageContentDeleterMock = {
  deleteMessageContent: deleteContentMock,
} as unknown as BlobMessageContentDeleter;

const cosmosMessageMetadataDeleterMock = {
  deleteMessageMetadata: deleteMessageMetadataMock,
} as unknown as CosmosMessageMetadataDeleter;

const cosmosMessageStatusDeleterMock = {
  deleteMessageStatuses: deleteMessageStatusesMock,
} as unknown as CosmosMessageStatusDeleter;

const deletedMessagesLogsMock = {
  uploadBlockBlob: uploadBlockBlobMock,
} as unknown as ContainerClient;

const deleteMessageUseCase = new DeleteMessageUseCase(
  logger,
  blobMessageContentDeleterMock,
  cosmosMessageMetadataDeleterMock,
  cosmosMessageStatusDeleterMock,
  deletedMessagesLogsMock,
);

describe("DeleteMessageUseCase.execute", () => {
  test("should log the starting operation, then it should attempt to delete metadata, statuses and content", async () => {
    const fiscalCode = "RMLGNN97R06F158N";
    const messageId = "01JP800CXX3ZM82SZNPFAQW7VS";

    await deleteMessageUseCase.execute(fiscalCode, messageId);

    expect(logger.info).toHaveBeenCalledWith(
      `Starting deletion of message with id ${messageId}`,
    );

    expect(deleteMessageMetadataMock).toHaveBeenCalledWith(
      fiscalCode,
      messageId,
    );
    expect(deleteContentMock).toHaveBeenCalledWith(messageId);
    expect(deleteMessageStatusesMock).toHaveBeenCalledWith(messageId);
    expect(uploadBlockBlobMock).toHaveBeenCalledWith(
      messageId,
      Buffer.from(messageId),
      messageId.length,
    );
  });
});
