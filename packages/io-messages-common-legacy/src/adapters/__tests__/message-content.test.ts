import { BlobServiceClient, RestError } from "@azure/storage-blob";
import { Readable } from "stream";
import { beforeEach, describe, expect, test, vi } from "vitest";

import {
  BlobStorageErrorException,
  MessageContentBlobAdapter,
} from "../message-content";

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

const repo = new MessageContentBlobAdapter(
  mockBlobServiceClient,
  CONTAINER_NAME,
);

describe("MessageContentBlobAdapter.getByMessageContentById", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

  test("should return null on 404 (blob not found)", async () => {
    const restError = new RestError("The specified blob does not exist.", {
      code: "BlobNotFound",
      statusCode: 404,
    });
    downloadMock.mockRejectedValueOnce(restError);
    const result = await repo.getByMessageContentById(MESSAGE_ID);
    expect(result).toBeNull();

    // also verify via direct downloadBlobContent mock
    const blobNotFoundError = new BlobStorageErrorException(
      "BlobNotFound",
      "The specified blob does not exist.",
    );
    vi.spyOn(repo as never, "downloadBlobContent").mockResolvedValueOnce(
      blobNotFoundError,
    );
    const result2 = await repo.getByMessageContentById(MESSAGE_ID);
    expect(result2).toBeNull();
  });

  test("should throw on non-404 storage errors", async () => {
    const restError = new RestError("Internal server error", {
      statusCode: 500,
    });
    downloadMock.mockRejectedValueOnce(restError);
    await expect(repo.getByMessageContentById(MESSAGE_ID)).rejects.toThrow(
      "Internal server error",
    );

    // also verify via direct downloadBlobContent mock
    const genericError = new BlobStorageErrorException(
      "GenericCode",
      "Something went wrong",
    );
    vi.spyOn(repo as never, "downloadBlobContent").mockResolvedValueOnce(
      genericError,
    );
    await expect(repo.getByMessageContentById(MESSAGE_ID)).rejects.toThrow(
      "Something went wrong",
    );
  });

  test("should throw on unexpected download errors", async () => {
    downloadMock.mockRejectedValueOnce(new Error("network timeout"));
    await expect(repo.getByMessageContentById(MESSAGE_ID)).rejects.toThrow(
      "network timeout",
    );

    // also verify any non-BlobNotFound code preserves the message
    const customError = new BlobStorageErrorException(
      "AuthorizationFailure",
      "Access denied to blob storage",
    );
    vi.spyOn(repo as never, "downloadBlobContent").mockResolvedValueOnce(
      customError,
    );
    await expect(repo.getByMessageContentById(MESSAGE_ID)).rejects.toThrow(
      "Access denied to blob storage",
    );
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

    await expect(repo.getByMessageContentById(MESSAGE_ID)).rejects.toThrow(
      "Cannot parse content text",
    );
  });

  test("should throw if the parsed JSON does not match MessageContent schema", async () => {
    downloadMock.mockResolvedValueOnce({
      readableStreamBody: makeStream(JSON.stringify({ invalid: "shape" })),
    });

    await expect(repo.getByMessageContentById(MESSAGE_ID)).rejects.toThrow(
      "Cannot deserialize stored message content",
    );
  });

  test("should throw if readableStreamBody is undefined", async () => {
    downloadMock.mockResolvedValueOnce({ readableStreamBody: undefined });

    await expect(repo.getByMessageContentById(MESSAGE_ID)).rejects.toThrow(
      "Unexpected: readableStreamBody is undefined",
    );
  });
});
