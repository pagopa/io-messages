import { Container } from "@azure/cosmos";
import { pino } from "pino";
import { describe, expect, test, vi } from "vitest";

import { CosmosMessageStatusDeleter } from "../message-status-deleter.js";

const logger = pino({ level: "silent" });
vi.spyOn(logger, "info");
vi.spyOn(logger, "error");

const fetchAllMock = vi
  .fn()
  .mockResolvedValue({ resources: [{ id: "1" }, { id: "2" }] });
const queryMock = vi.fn().mockReturnValue({ fetchAll: fetchAllMock });
const deleteMock = vi.fn().mockResolvedValue({ item: { id: "1" } });
const itemMock = vi.fn().mockReturnValue({ delete: deleteMock });

const container = {
  item: itemMock,
  items: {
    query: queryMock,
  },
} as unknown as Container;

const cosmosMessageStatusDeleter = new CosmosMessageStatusDeleter(container);

const partitionKey = "01JP800CXX3ZM82SZNPFAQW7VS";

describe("CosmosMessageStatusDeleter.deleteMessageStatuses", () => {
  test("should return true if message statuses were deleted successfully", async () => {
    await expect(
      cosmosMessageStatusDeleter.deleteMessageStatuses(partitionKey),
    ).resolves.toMatchObject({ success: true });

    expect(container.items.query).toHaveBeenCalledWith({
      parameters: [{ name: "@partitionKey", value: partitionKey }],
      query: "SELECT c.id FROM c WHERE c.messageId = @partitionKey",
    });

    expect(container.item).toHaveBeenCalledWith("1", partitionKey);
    expect(container.item).toHaveBeenCalledWith("2", partitionKey);
  });

  test("should resolve with success = false if deletion fails for a single status", async () => {
    deleteMock.mockRejectedValueOnce({ message: "Deletion Error" });

    await expect(
      cosmosMessageStatusDeleter.deleteMessageStatuses(partitionKey),
    ).resolves.toMatchObject({ failedOperation: 1, success: false });
  });

  test("should reject with an error if deletion fails", async () => {
    queryMock.mockRejectedValueOnce({ message: "Query error" });

    await expect(
      cosmosMessageStatusDeleter.deleteMessageStatuses(partitionKey),
    ).rejects.toThrow(
      new Error(
        `Failed to delete message statuses with partition key ${partitionKey}`,
      ),
    );
  });
});
