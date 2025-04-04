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
);

const messageId = "01JP800CXX3ZM82SZNPFAQW7VS";
const fiscalCode = "RMLGNN97R06F158N";

describe("CosmosMessageMetadataDeleter.deleteMessageMetadata", () => {
  test("should return true if message metadata were deleted successfully", async () => {
    await expect(
      cosmosMessageMetadataDeleter.deleteMessageMetadata(fiscalCode, messageId),
    ).resolves.toMatchObject({ success: true });

    expect(containerMock.item).toHaveBeenCalledWith(messageId, fiscalCode);
  });

  test("should return false with statusCode if deletion fails with a non-204 status code", async () => {
    deleteMock.mockResolvedValue({ statusCode: 400 });

    await expect(
      cosmosMessageMetadataDeleter.deleteMessageMetadata(fiscalCode, messageId),
    ).resolves.toMatchObject({ statusCode: 400, success: false });
  });

  test("should reject with an error if an unknown exception is thrown", async () => {
    deleteMock.mockRejectedValue(new Error("Unknown Error"));

    await expect(
      cosmosMessageMetadataDeleter.deleteMessageMetadata(fiscalCode, messageId),
    ).rejects.toThrow(
      new Error(`Failed to delete message metadata for message ${messageId}`),
    );
  });
});
