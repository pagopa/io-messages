import { BlobServiceClient, RestError } from "@azure/storage-blob";
import { Readable } from "stream";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { MessageContentRepo } from "../message-content-repository";

const makeStream = (content: string): NodeJS.ReadableStream => {
  const readable = new Readable({ read() {} });
  readable.push(Buffer.from(content, "utf-8"));
  readable.push(null);
  return readable;
};

const aValidMessageContent = {
  markdown: "x".repeat(80),
  subject: "y".repeat(10),
};

const downloadMock = vi.fn();
const getBlobClientMock = vi.fn().mockReturnValue({ download: downloadMock });
const getContainerClientMock = vi
  .fn()
  .mockReturnValue({ getBlobClient: getBlobClientMock });

const mockBlobServiceClient = {
  getContainerClient: getContainerClientMock,
} as unknown as BlobServiceClient;

const CONTAINER_NAME = "message-content";
const MESSAGE_ID = "A_MESSAGE_ID";

describe("MessageContentRepo.getByMessageContentById", () => {
  let repo: MessageContentRepo;

  beforeEach(() => {
    vi.clearAllMocks();
    repo = new MessageContentRepo(mockBlobServiceClient, CONTAINER_NAME);
  });

  test("should return parsed MessageContent for a valid blob", async () => {
    downloadMock.mockResolvedValueOnce({
      readableStreamBody: makeStream(JSON.stringify(aValidMessageContent)),
    });

    const result = await repo.getByMessageContentById(MESSAGE_ID);

    expect(getBlobClientMock).toHaveBeenCalledWith(`${MESSAGE_ID}.json`);
    expect(result).toMatchObject(aValidMessageContent);
  });

  test("should request the correct container", async () => {
    downloadMock.mockResolvedValueOnce({
      readableStreamBody: makeStream(JSON.stringify(aValidMessageContent)),
    });

    await repo.getByMessageContentById(MESSAGE_ID);

    expect(getContainerClientMock).toHaveBeenCalledWith(CONTAINER_NAME);
  });

  test("should throw BlobStorageErrorException with BlobNotFound code on 404", async () => {
    const restError = Object.assign(
      new Error("The specified blob does not exist."),
      {
        name: "RestError",
        statusCode: 404,
      } as Partial<RestError>,
    );
    downloadMock.mockRejectedValueOnce(restError);

    await expect(
      repo.getByMessageContentById(MESSAGE_ID),
    ).rejects.toMatchObject({
      code: "BlobNotFound",
      name: "BlobStorageErrorException",
    });
  });

  test("should throw BlobStorageErrorException with GenericError code on non-404 storage errors", async () => {
    const restError = Object.assign(new Error("Internal server error"), {
      name: "RestError",
      statusCode: 500,
    } as Partial<RestError>);
    downloadMock.mockRejectedValueOnce(restError);

    await expect(
      repo.getByMessageContentById(MESSAGE_ID),
    ).rejects.toMatchObject({
      code: "GenericError",
      name: "BlobStorageErrorException",
    });
  });

  test("should throw BlobStorageErrorException with GenericError code on unexpected download errors", async () => {
    downloadMock.mockRejectedValueOnce(new Error("network timeout"));

    await expect(
      repo.getByMessageContentById(MESSAGE_ID),
    ).rejects.toMatchObject({
      code: "GenericError",
      name: "BlobStorageErrorException",
    });
  });

  test("should throw if the blob body stream emits an error", async () => {
    const errorStream = new Readable({ read() {} });
    downloadMock.mockResolvedValueOnce({ readableStreamBody: errorStream });

    const resultPromise = repo.getByMessageContentById(MESSAGE_ID);
    // emit on next tick so streamToText has already attached the error listener
    setImmediate(() => errorStream.emit("error", new Error("stream failure")));

    await expect(resultPromise).rejects.toThrow("stream failure");
  });

  test("should throw if the blob content is not valid JSON", async () => {
    downloadMock.mockResolvedValueOnce({
      readableStreamBody: makeStream("not-valid-json{{{"),
    });

    await expect(
      repo.getByMessageContentById(MESSAGE_ID),
    ).rejects.toMatchObject({
      code: "GenericError",
      message: expect.stringContaining("Cannot parse content text"),
    });
  });

  test("should throw if the parsed JSON does not match MessageContent schema", async () => {
    downloadMock.mockResolvedValueOnce({
      readableStreamBody: makeStream(JSON.stringify({ invalid: "shape" })),
    });

    await expect(repo.getByMessageContentById(MESSAGE_ID)).rejects.toThrow(
      "Cannot deserialize stored message content",
    );
  });
});
