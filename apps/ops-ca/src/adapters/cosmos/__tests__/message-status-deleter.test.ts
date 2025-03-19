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

const cosmosMessageStatusDeleter = new CosmosMessageStatusDeleter(
  container,
  logger,
);

const partitionKey = "01JP800CXX3ZM82SZNPFAQW7VS";

describe("CosmosMessageStatusDeleter.deleteMessageStatuses", () => {
  test("should log a success if message statuses were deleted successfully", async () => {
    await cosmosMessageStatusDeleter.deleteMessageStatuses(partitionKey);

    expect(container.items.query).toHaveBeenCalledWith({
      parameters: [{ name: "@partitionKey", value: partitionKey }],
      query: "SELECT c.id FROM c WHERE c.messageId = @partitionKey",
    });

    expect(logger.info).toHaveBeenCalledWith(
      `Attempting to delete 2 message statuses with partition key ${partitionKey}`,
    );

    expect(container.item).toHaveBeenCalledWith("1", partitionKey);
    expect(container.item).toHaveBeenCalledWith("2", partitionKey);

    expect(logger.info).toHaveBeenCalledWith(
      "message-status with id 1 deleted successfully",
    );
  });

  test("should log an error if deletion fails", async () => {
    deleteMock.mockRejectedValue({ message: "Deletion Error" });

    await cosmosMessageStatusDeleter.deleteMessageStatuses(partitionKey);

    expect(logger.error).toHaveBeenCalledWith(
      `Error deleting message statuses with partition key ${partitionKey} | Message: {"message":"Deletion Error"}`,
    );
  });
});
