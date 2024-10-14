import { describe, test, expect, vi } from "vitest";
import { MessageAdapter } from "../message.js";
import { BlobMessageContent } from "../blob-storage/message-content.js";
import {
  aSimpleMessageContent,
  aSimpleMessageMetadata,
} from "@/__mocks__/message.js";
import * as z from "zod";
import { Message } from "@/domain/entities/message.js";
import { RestError } from "@azure/storage-blob";

const getMessageByMetadataMock = vi.fn();

const messageContentMock = {
  getMessageByMetadata: getMessageByMetadataMock,
} as unknown as BlobMessageContent;

const messageAdapter = new MessageAdapter(messageContentMock);

describe("getMessageByMetadata", () => {
  test("Given a message metadata, when the BlobMessageContent return a Message, then it should return it", async () => {
    getMessageByMetadataMock.mockReturnValueOnce(
      Promise.resolve(
        new Message(
          aSimpleMessageMetadata.id,
          aSimpleMessageContent,
          aSimpleMessageMetadata,
        ),
      ),
    );
    const r = await messageAdapter.getMessageByMetadata(aSimpleMessageMetadata);
    expect(r).toBeInstanceOf(Message);
  });

  test("Given a message metadata, when the BlobMessageContent return a ZodError, then it should return it", async () => {
    getMessageByMetadataMock.mockReturnValueOnce(
      Promise.resolve(new z.ZodError([])),
    );
    const r = await messageAdapter.getMessageByMetadata(aSimpleMessageMetadata);
    expect(r).toBeInstanceOf(z.ZodError);
  });

  test("Given a message metadata, when the BlobMessageContent return a RestError, then it should return it", async () => {
    getMessageByMetadataMock.mockReturnValueOnce(
      Promise.resolve(
        new RestError("The specified blob does not exist.", {
          code: "BlobNotFound",
          statusCode: 404,
        }),
      ),
    );
    const r = await messageAdapter.getMessageByMetadata(aSimpleMessageMetadata);
    expect(r).toBeInstanceOf(RestError);
  });

  test("Given a message metadata, when the BlobMessageContent throws an error, then it should throw it", async () => {
    getMessageByMetadataMock.mockReturnValueOnce(Promise.reject({}));
    await expect(
      messageAdapter.getMessageByMetadata(aSimpleMessageMetadata),
    ).rejects.toThrowError();
  });
});
