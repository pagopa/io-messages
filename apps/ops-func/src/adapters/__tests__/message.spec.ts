import { Container, CosmosClient, QueryIterator } from "@azure/cosmos";
import { BlobClient, BlobServiceClient } from "@azure/storage-blob";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { MessageRepositoryAdapter } from "../message.js";

const cosmosClient = new CosmosClient(
  "AccountEndpoint=https://vitest/;AccountKey=C2y6yDjf5/R+ob0N8A7Cgv30VRDJIWEHLM+4QDU5DE2nQ9nDuVTqobD4b8mGGyPMbIZnqyMsEcaGQy67XIw/Jw==;",
);

const blobClient = BlobServiceClient.fromConnectionString(
  "UseDevelopmentStorage=true",
);

const deleteItemMock = vi.fn().mockImplementation(() => ({
  statusCode: 204,
}));

const fetchAllMock = () =>
  vi.fn().mockResolvedValue({
    resources: [{ id: "STATUS_ID_1" }, { id: "STATUS_ID_2" }],
  });

vi.spyOn(Container.prototype, "item").mockImplementation(
  vi.fn().mockReturnValue({
    delete: deleteItemMock,
  }),
);

vi.spyOn(QueryIterator.prototype, "fetchAll").mockImplementation(
  fetchAllMock(),
);

const deleteIfExistsSpy = vi
  .spyOn(BlobClient.prototype, "deleteIfExists")
  .mockImplementation(vi.fn());

describe("MessageRepositoryAdapter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("successful deletion", async () => {
    const db = cosmosClient.database("test");

    const repo = new MessageRepositoryAdapter(db, blobClient);

    await expect(
      repo.deleteMessage("FISCAL_CODE", "MESSAGE_ID"),
    ).resolves.toBeUndefined();

    // Check that item.delete() was called the correct
    // number of times. 1 message + 2 statuses
    expect(deleteItemMock).toHaveBeenCalledTimes(3);

    // Check if the content was deleted
    expect(deleteIfExistsSpy).toHaveBeenCalledOnce();

    // Check if the log was uploaded, with the right content
    /*expect(uploadBlockBlobSpy).toHaveBeenCalledWith(
      "MESSAGE_ID",
      Buffer.from("MESSAGE_ID"),
      10,
    );*/
  });

  test.each([
    {
      entity: "metadata",
      id: "MESSAGE_ID",
    },
    {
      entity: "status",
      id: "STATUS_ID_1",
    },
  ])("fail on error deleting $entity", async ({ entity, id }) => {
    const db = cosmosClient.database("test");

    // Mock the delete method to throw an error when deleting metadata
    vi.spyOn(db, "container").mockImplementation(
      vi.fn().mockReturnValue({
        item: vi.fn().mockImplementation((itemId) => ({
          delete: vi.fn().mockResolvedValue({
            statusCode: itemId === id ? 400 : 204,
          }),
        })),
      }),
    );

    const repo = new MessageRepositoryAdapter(db, blobClient);

    await expect(
      repo.deleteMessage("FISCAL_CODE", "MESSAGE_ID"),
    ).rejects.toThrowError(new RegExp(entity));
  });

  test("fail on error deleting content", async () => {
    const db = cosmosClient.database("test");

    const repo = new MessageRepositoryAdapter(db, blobClient);

    deleteIfExistsSpy.mockRejectedValueOnce(new Error("Upload error"));

    await expect(
      repo.deleteMessage("FISCAL_CODE", "MESSAGE_ID"),
    ).rejects.toThrowError(/content/);
  });
});
