import * as E from "fp-ts/Either";
import {
  aMessageContent,
  aRetrievedMessageWithoutContent,
} from "../../__mocks__/message";

import { enrichMessageContent } from "../message";
import { vi, beforeEach, describe, test, expect } from "vitest";
import { RetrievedMessage } from "@pagopa/io-functions-commons/dist/src/models/message";

const getByMessageContentByIdMock = vi.fn().mockResolvedValue(aMessageContent);
const mockMessageContentRepository = {
  getByMessageContentById: getByMessageContentByIdMock,
  storeMessageContent: vi.fn().mockResolvedValue(void 0),
};

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
      mockMessageContentRepository,
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
    getByMessageContentByIdMock.mockRejectedValueOnce(
      new Error("cannot reach blob storage"),
    );

    const result = await enrichMessageContent(
      mockMessageContentRepository,
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

  test("should return a retriable error if message content cannot be found", async () => {
    getByMessageContentByIdMock.mockRejectedValueOnce(
      new Error("BlobNotFound"),
    );

    const result = await enrichMessageContent(
      mockMessageContentRepository,
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
});
