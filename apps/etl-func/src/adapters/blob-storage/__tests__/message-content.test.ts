import {
  aSimpleMessageContent,
  aSimpleMessageMetadata,
} from "@/__mocks__/message.js";
import { Message } from "@/domain/entities/message.js";
import { RestError } from "@azure/storage-blob";
import { Readable } from "node:stream";
import { describe, expect, test, vi } from "vitest";
import * as z from "zod";

import { BlobMessageContent } from "../message-content.js";

const mocks = vi.hoisted(() => ({
  BlobServiceClient: vi.fn().mockReturnValue({
    getContainerClient: () => ({
      getBlobClient: () => ({
        download: downloadMock,
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

//TODO: move this to a specific mock file
const downloadMock = vi.fn(() =>
  Promise.resolve({
    readableStreamBody: Readable.from(JSON.stringify(aSimpleMessageContent)),
  }),
);

const storageUri = "http://storageuri";
const contaienrName = "message-container-name";
const blobMessageContent = new BlobMessageContent(storageUri, contaienrName);

const anExistingMessageId = "01EHA1R1TSJP8DNYYG2TTR1B28";

describe("getMessageContentById", () => {
  test("Given a message id which refers to an existing message, when the storage is reachable then it should return the content of the message", async () => {
    await expect(
      blobMessageContent.getMessageContentById(anExistingMessageId),
    ).resolves.toMatchObject({
      markdown:
        "A valid markdown, this should be more than 80 chars, otherwise an error occurs. Ensure that this line is more than 80 chars",
      require_secure_channels: false,
      subject: "A valid subject, this is used as title",
    });
  });

  test("Given a message id which refers to an existing message, when the storage is not reachable then it should throw an error", async () => {
    downloadMock.mockReturnValueOnce(Promise.reject());
    await expect(
      blobMessageContent.getMessageContentById(anExistingMessageId),
    ).rejects.toThrowError();
  });

  test("Given a message id which refers to an existing message, when the storage is reachable then it should return an error if the message content does not match the decoder", async () => {
    downloadMock.mockReturnValueOnce(
      Promise.resolve({
        readableStreamBody: Readable.from(
          JSON.stringify(anInvalidMessageContent),
        ),
      }),
    );
    await expect(
      blobMessageContent.getMessageContentById(anExistingMessageId),
    ).resolves.toBeInstanceOf(z.ZodError);
  });

  test("Given a message id which refers to a non existing message, when the storage is reachable then it should return a RestError with code 404", async () => {
    downloadMock.mockReturnValueOnce(
      Promise.reject(
        new RestError("The specified blob does not exist.", {
          code: "BlobNotFound",
          statusCode: 404,
        }),
      ),
    );
    const r =
      await blobMessageContent.getMessageContentById(anExistingMessageId);
    expect(r).toBeInstanceOf(RestError);
    if (r instanceof RestError) {
      expect(r.statusCode).toBe(404);
    }
  });
});

describe("getMessageByMetadata", () => {
  test("Given a message metadata, when the metadata contains a messageId which refers to an existing message, then it should return a new Message", async () => {
    const r = await blobMessageContent.getMessageByMetadata(
      aSimpleMessageMetadata,
    );
    expect(r).toBeInstanceOf(Message);
  });

  test("Given message metadata, when the storage is not reachable then it should throw an error", async () => {
    downloadMock.mockReturnValueOnce(Promise.reject());
    await expect(
      blobMessageContent.getMessageByMetadata(aSimpleMessageMetadata),
    ).rejects.toThrowError();
  });

  test("Given message metadata, when the related message-content does not exist, then it should return a RestError with code 404", async () => {
    downloadMock.mockReturnValueOnce(
      Promise.reject(
        new RestError("The specified blob does not exist.", {
          code: "BlobNotFound",
          statusCode: 404,
        }),
      ),
    );

    const r = await blobMessageContent.getMessageByMetadata(
      aSimpleMessageMetadata,
    );
    expect(r).toBeInstanceOf(RestError);
    if (r instanceof RestError) {
      expect(r.statusCode).toBe(404);
    }
  });
});
