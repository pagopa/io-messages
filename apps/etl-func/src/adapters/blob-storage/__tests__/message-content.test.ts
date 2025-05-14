import {
  aSimpleMessageContent,
  aSimpleMessageMetadata,
} from "@/__mocks__/message.js";
import { describe, expect, test, vi } from "vitest";

import { BlobNotFoundError } from "../blob.js";
import { BlobMessageContent, MessageContentError } from "../message-content.js";

const mocks = vi.hoisted(() => ({
  BlobServiceClient: vi.fn().mockReturnValue({
    getContainerClient: () => ({
      getBlobClient: () => ({
        downloadToBuffer: downloadMock,
      }),
    }),
  }),
}));

vi.mock("@azure/storage-blob", async (importOriginal) => {
  const original = await importOriginal<typeof import("@azure/storage-blob")>();
  return {
    ...original,
    BlobServiceClient: mocks.BlobServiceClient,
  };
});

const anInvalidMessageContent = {
  ...aSimpleMessageContent,
  subject: "",
};

const downloadMock = vi.fn(() =>
  Promise.resolve(Buffer.from(JSON.stringify(aSimpleMessageContent))),
);

const blobClient = new mocks.BlobServiceClient();

const blobMessageContent = new BlobMessageContent(
  blobClient,
  "message-container-name",
);

describe("getByMessageId", () => {
  test("Given a message id which refers to an existing message, when the storage is reachable then it should return the content of the message", async () => {
    await expect(
      blobMessageContent.getByMessageContentById(aSimpleMessageMetadata.id),
    ).resolves.toMatchObject({
      markdown:
        "A valid markdown, this should be more than 80 chars, otherwise an error occurs. Ensure that this line is more than 80 chars",
      require_secure_channels: false,
      subject: "A valid subject, this is used as title",
    });
  });

  test("Given a message id which refers to an existing message, when the storage is not reachable then it should throw an error", async () => {
    downloadMock.mockRejectedValueOnce(new Error("Unexpected"));

    await expect(() =>
      blobMessageContent.getByMessageContentById(aSimpleMessageMetadata.id),
    ).rejects.toThrowError();
  });

  test("Given a message id which refers to an existing message, when the storage is reachable then it should return an error if the message content is invalid", async () => {
    downloadMock.mockResolvedValueOnce(
      Buffer.from(JSON.stringify(anInvalidMessageContent)),
    );
    await expect(() =>
      blobMessageContent.getByMessageContentById(aSimpleMessageMetadata.id),
    ).rejects.toThrowError(MessageContentError);
  });

  test("Given a message id which refers to a non existing message, when the storage is reachable then it should return a RestError with code 404", async () => {
    downloadMock.mockReturnValueOnce(Promise.reject(new BlobNotFoundError()));
    await expect(() =>
      blobMessageContent.getByMessageContentById(aSimpleMessageMetadata.id),
    ).rejects.toThrowError(MessageContentError);
  });
});
