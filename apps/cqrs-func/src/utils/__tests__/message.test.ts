import * as E from "fp-ts/Either";
import * as O from "fp-ts/lib/Option";
import * as TE from "fp-ts/TaskEither";
import {
  aMessageContent,
  aRetrievedMessageWithoutContent,
} from "../../__mocks__/message";

import { enrichMessageContent } from "../message";
import { vi, beforeEach, describe, test, expect } from "vitest";
import { RetrievedMessage } from "@pagopa/io-functions-commons/dist/src/models/message";

const downloadToBufferMock = vi
  .fn()
  .mockResolvedValue(Buffer.from(JSON.stringify(aMessageContent)));

const mockBlobClient = { downloadToBuffer: downloadToBufferMock };

const mockContainerClient = {
  getBlobClient: vi.fn().mockReturnValue(mockBlobClient),
} as any;

const aRetrievedMessage: RetrievedMessage = {
  ...aRetrievedMessageWithoutContent,
  kind: "IRetrievedMessageWithoutContent",
};

describe("enrichMessageContent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("should enrich a message with its' related content", async () => {
    const result = await enrichMessageContent(
      mockContainerClient,
      aRetrievedMessage,
    )();

    expect(E.isRight(result)).toBeTruthy();
    if (E.isRight(result)) {
      expect(result.right).toEqual({
        ...aRetrievedMessage,
        content: aMessageContent,
        kind: "IRetrievedMessageWithContent",
      });
    }
  });

  test("should return a retriable error if blob storage cannot retrieve the message content", async () => {
    downloadToBufferMock.mockRejectedValueOnce(
      new Error("cannot reach blob storage"),
    );

    const result = await enrichMessageContent(
      mockContainerClient,
      aRetrievedMessage,
    )();

    expect(E.isLeft(result)).toBeTruthy();
    if (E.isLeft(result)) {
      expect(result.left).toEqual(
        expect.objectContaining({
          retriable: true,
        }),
      );
    }
  });

  test("should return a not retriable error if message content cannot be found", async () => {
    downloadToBufferMock.mockRejectedValueOnce(
      Object.assign(new Error("BlobNotFound"), { statusCode: 404 }),
    );

    const result = await enrichMessageContent(
      mockContainerClient,
      aRetrievedMessage,
    )();

    expect(E.isLeft(result)).toBeTruthy();
    if (E.isLeft(result)) {
      expect(result.left).toEqual(
        expect.objectContaining({
          retriable: false,
        }),
      );
    }
  });
});
