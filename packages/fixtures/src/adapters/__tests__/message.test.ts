import { describe, test, expect, vi, beforeEach } from "vitest";
import { MessageRepositoryAdapter } from "../message.js";
import { CosmosClient, Items } from "@azure/cosmos";
import { BlobServiceClient, BlockBlobClient } from "@azure/storage-blob";
import { Message } from "io-messages-common/types/message";

const cosmosClient = new CosmosClient(
  "AccountEndpoint=https://vitest/;AccountKey=C2y6yDjf5/R+ob0N8A7Cgv30VRDJIWEHLM+4QDU5DE2nQ9nDuVTqobD4b8mGGyPMbIZnqyMsEcaGQy67XIw/Jw==;",
)
  .database("message")
  .container("messages");

const blobClient = BlobServiceClient.fromConnectionString(
  "UseDevelopmentStorage=true",
).getContainerClient("messages");

const createMock = vi.fn().mockResolvedValue(undefined);
const uploadMock = vi.fn().mockResolvedValue(undefined);

vi.spyOn(Items.prototype, "create").mockImplementation(createMock);
vi.spyOn(BlockBlobClient.prototype, "upload").mockImplementation(uploadMock);

const adapter = new MessageRepositoryAdapter(cosmosClient, blobClient);

describe("MessageRepositoryAdapter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("should load a message by calling both metadata and content loaders", async () => {
    const message = {
      id: "123",
      metadata: { id: "123", createdAt: "2023-01-01" },
      content: { text: "Hello, world!" },
    } as unknown as Message;

    const expectedContent = JSON.stringify({
      ...message.content,
      messageId: message.id,
    });

    await adapter.loadMessage(message);

    expect(createMock).toHaveBeenCalledWith(message.metadata);
    expect(uploadMock).toHaveBeenCalledWith(
      expectedContent,
      expectedContent.length,
    );
  });

  test("should throw an exception if cosmos throws", async () => {
    createMock.mockRejectedValueOnce(undefined);

    const message = {
      id: "123",
      metadata: { id: "123", createdAt: "2023-01-01" },
      content: { text: "Hello, world!" },
    } as unknown as Message;

    await expect(adapter.loadMessage(message)).rejects.toThrow();

    expect(createMock).toHaveBeenCalledWith(message.metadata);
    expect(uploadMock).not.toHaveBeenCalled();
  });

  test("should throw an exception if storage account throws", async () => {
    uploadMock.mockRejectedValueOnce(undefined);

    const message = {
      id: "123",
      metadata: { id: "123", createdAt: "2023-01-01" },
      content: { text: "Hello, world!" },
    } as unknown as Message;
    const expectedContent = JSON.stringify({
      ...message.content,
      messageId: message.id,
    });

    await expect(adapter.loadMessage(message)).rejects.toThrow();

    expect(createMock).toHaveBeenCalledWith(message.metadata);

    expect(uploadMock).toHaveBeenCalledWith(
      expectedContent,
      expectedContent.length,
    );
  });
});
