import { Container } from "@azure/cosmos";
import { pino } from "pino";
import { describe, expect, test, vi } from "vitest";

import { CosmosMessageMetadataDeleter } from "../message-metadata-deleter.js";

const deleteMock = vi.fn().mockResolvedValue({ statusCode: 204 });

const containerMock = {
  item: vi.fn().mockReturnValue({
    delete: deleteMock,
  }),
} as unknown as Container;

const logger = pino({ level: "silent" });
vi.spyOn(logger, "info");
vi.spyOn(logger, "error");

const cosmosMessageMetadataDeleter = new CosmosMessageMetadataDeleter(
  containerMock,
  logger,
);

const messageId = "01JP800CXX3ZM82SZNPFAQW7VS";
const fiscalCode = "RMLGNN97R06F158N";

describe("CosmosMessageMetadataDeleter.deleteMessageMetadata", () => {
  test("should log a success if message metadata were deleted successfully", async () => {
    await cosmosMessageMetadataDeleter.deleteMessageMetadata(
      fiscalCode,
      messageId,
    );

    expect(containerMock.item).toHaveBeenCalledWith(messageId, fiscalCode);
    expect(logger.info).toHaveBeenCalledWith(
      `Message metadata with id ${messageId} deleted successfully`,
    );
  });

  test("should log an error if deletion fails with a non-204 status code", async () => {
    deleteMock.mockResolvedValue({ statusCode: 400 });

    await cosmosMessageMetadataDeleter.deleteMessageMetadata(
      fiscalCode,
      messageId,
    );

    expect(logger.error).toHaveBeenCalledWith(
      `Error deleting message metadata with id ${messageId} | Status: 400`,
    );
  });

  test("should log an error if an unknown exception is thrown", async () => {
    deleteMock.mockRejectedValue(new Error("Unknown Error"));

    await cosmosMessageMetadataDeleter.deleteMessageMetadata(
      fiscalCode,
      messageId,
    );

    expect(logger.error).toHaveBeenCalledWith(
      `Error deleting message metadata with id ${messageId} | Error: Unknown Error`,
    );
  });
});
