import { RetrievedMessage } from "@pagopa/io-functions-commons/dist/src/models/message";
import * as E from "fp-ts/Either";
import * as O from "fp-ts/lib/Option";
import * as TE from "fp-ts/TaskEither";
import {
  aMessageContent,
  aRetrievedMessageWithoutContent,
} from "../../__mocks__/message";

import * as messageUtils from "../message-utils";
import { enrichMessageContent } from "../message";
import { vi, beforeEach, describe, test, expect } from "vitest";

const getContentFromBlobMock = vi
  .fn()
  .mockImplementation(() => TE.right(O.some(aMessageContent)));
const mockMessageModel = {
  find: vi.fn(),
  getContentFromBlob: getContentFromBlobMock,
};

const mockBlobService = {
  primary: {},
  secondary: {},
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
    vi.spyOn(messageUtils, "getContentFromBlob").mockImplementation(() =>
      TE.right(O.some(aMessageContent)),
    );

    const result = await enrichMessageContent(
      mockMessageModel as any,
      mockBlobService as any,
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
    vi.spyOn(messageUtils, "getContentFromBlob").mockImplementation(() =>
      TE.left(new Error("cannot reach blob storage")),
    );

    const result = await enrichMessageContent(
      mockMessageModel as any,
      mockBlobService as any,
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
    vi.spyOn(messageUtils, "getContentFromBlob").mockImplementation(() =>
      TE.right(O.none),
    );

    const result = await enrichMessageContent(
      mockMessageModel as any,
      mockBlobService as any,
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
