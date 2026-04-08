import * as t from "io-ts";

import * as E from "fp-ts/lib/Either";
import * as O from "fp-ts/lib/Option";
import * as TE from "fp-ts/lib/TaskEither";

import * as KP from "@pagopa/fp-ts-kafkajs/dist/lib/KafkaProducerCompact";
import { RetrievedMessage } from "@pagopa/io-functions-commons/dist/src/models/message";
import { pipe } from "fp-ts/lib/function";
import {
  aMessageContent,
  aRetrievedMessageWithoutContent,
} from "../../../__mocks__/message";
import { handleMessageChange } from "../handler";
import { vi, beforeEach, describe, test, expect } from "vitest";

// ----------------------
// Variables
// ----------------------

const topic = "aTopic";

const aListOfRightMessages = pipe(
  Array.from({ length: 10 }, (i) => aRetrievedMessageWithoutContent),
  t.array(RetrievedMessage).decode,
  E.getOrElseW(() => {
    throw Error();
  }),
);

// ----------------------
// Mocks
// ----------------------

const mockAppinsights = {
  trackEvent: vi.fn().mockReturnValue(void 0),
} as any;

const mockQueueClient = {
  sendMessage: vi.fn().mockImplementation(() => Promise.resolve(void 0)),
} as any;

const downloadToBufferMock = vi
  .fn()
  .mockResolvedValue(Buffer.from(JSON.stringify(aMessageContent)));

const mockContainerClient = {
  getBlobClient: vi.fn().mockImplementation(() => ({
    downloadToBuffer: downloadToBufferMock,
  })),
} as any;

const mockKafkaProducerKompact: KP.KafkaProducerCompact<
  RetrievedMessage
> = () => ({
  producer: {} as any,
  topic: { topic },
});

const kafkaSendMessagesMock = vi.fn().mockImplementation(TE.of);
vi.spyOn(KP, "sendMessages").mockImplementation((_) => kafkaSendMessagesMock);
const defaultStartTime = 0;

// ----------------------
// Tests
// ----------------------

describe("CosmosApiMessagesChangeFeed", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    downloadToBufferMock.mockResolvedValue(
      Buffer.from(JSON.stringify(aMessageContent)),
    );
  });

  test("should send all retrieved messages", async () => {
    const handler = handleMessageChange(mockContainerClient, defaultStartTime);

    const res = await handler(
      mockKafkaProducerKompact,
      mockQueueClient,
      mockAppinsights,
      "cqrsName",
      aListOfRightMessages,
    );

    expect(downloadToBufferMock).toHaveBeenCalledTimes(
      aListOfRightMessages.length,
    );

    expect(mockQueueClient.sendMessage).not.toHaveBeenCalled();
    expect(res).toMatchObject(
      expect.objectContaining({
        results: `Documents sent (${aListOfRightMessages.length}).`,
      }),
    );
  });

  test("should not call sendMessages on Kafka producer if all messages are pending", async () => {
    const handler = handleMessageChange(mockContainerClient, defaultStartTime);

    const res = await handler(
      mockKafkaProducerKompact,
      mockQueueClient,
      mockAppinsights,
      "cqrsName",
      aListOfRightMessages.map((m) => ({
        ...m,
        isPending: true,
      })),
    );

    expect(downloadToBufferMock).not.toHaveBeenCalled();

    expect(mockQueueClient.sendMessage).not.toHaveBeenCalled();
    expect(res).toMatchObject(
      expect.objectContaining({
        results: "Documents sent (0).",
      }),
    );
  });

  test("should send only non pending messages", async () => {
    const handler = handleMessageChange(mockContainerClient, defaultStartTime);

    const res = await handler(
      mockKafkaProducerKompact,
      mockQueueClient,
      mockAppinsights,
      "cqrsName",
      [
        ...aListOfRightMessages,
        { ...aRetrievedMessageWithoutContent, isPending: true },
      ],
    );

    expect(downloadToBufferMock).toHaveBeenCalledTimes(
      aListOfRightMessages.length,
    );

    expect(mockQueueClient.sendMessage).not.toHaveBeenCalled();
    expect(res).toMatchObject(
      expect.objectContaining({
        results: `Documents sent (${aListOfRightMessages.length}).`,
      }),
    );
  });

  test("should send only non pending messages that are created after startTimeFilter", async () => {
    const handler = handleMessageChange(
      mockContainerClient,
      aRetrievedMessageWithoutContent.createdAt.getTime(),
    );

    const res = await handler(
      mockKafkaProducerKompact,
      mockQueueClient,
      mockAppinsights,
      "cqrsName",
      [
        ...aListOfRightMessages,
        {
          ...aRetrievedMessageWithoutContent,
          createdAt: new Date(
            aRetrievedMessageWithoutContent.createdAt.getTime() - 1000,
          ),
        },
        { ...aRetrievedMessageWithoutContent, isPending: true },
      ],
    );

    expect(downloadToBufferMock).toHaveBeenCalledTimes(
      aListOfRightMessages.length,
    );

    expect(mockQueueClient.sendMessage).not.toHaveBeenCalled();
    expect(res).toMatchObject(
      expect.objectContaining({
        results: `Documents sent (${aListOfRightMessages.length}).`,
      }),
    );
  });
});

describe("CosmosApiMessagesChangeFeed - Errors", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    downloadToBufferMock.mockResolvedValue(
      Buffer.from(JSON.stringify(aMessageContent)),
    );
  });

  test.each`
    downloadError
    ${new Error("An error occurred")}
    ${Object.assign(new Error("BlobNotFound"), { statusCode: 404 })}
  `(
    "should store error if a content cannot be retrieved",
    async ({ downloadError }) => {
      downloadToBufferMock.mockRejectedValueOnce(downloadError);

      const handler = handleMessageChange(
        mockContainerClient,
        defaultStartTime,
      );

      const res = await handler(
        mockKafkaProducerKompact,
        mockQueueClient,
        mockAppinsights,
        "cqrsName",
        aListOfRightMessages,
      );

      expect(downloadToBufferMock).toHaveBeenCalledTimes(
        aListOfRightMessages.length,
      );

      expect(mockQueueClient.sendMessage).toHaveBeenCalledTimes(1);
      expect(res).toMatchObject(
        expect.objectContaining({
          errors: `Processed (1) errors`,
          results: `Documents sent (${aListOfRightMessages.length - 1}).`,
        }),
      );
    },
  );

  test("should send only decoded retrieved messages", async () => {
    const handler = handleMessageChange(mockContainerClient, defaultStartTime);

    const res = await handler(
      mockKafkaProducerKompact,
      mockQueueClient,
      mockAppinsights,
      "cqrsName",
      [...aListOfRightMessages, { error: "error" }],
    );

    expect(downloadToBufferMock).toHaveBeenCalledTimes(
      aListOfRightMessages.length,
    );

    expect(mockQueueClient.sendMessage).toHaveBeenCalledTimes(1);
    expect(res).toMatchObject(
      expect.objectContaining({
        errors: `Processed (1) errors`,
        results: `Documents sent (${aListOfRightMessages.length}).`,
      }),
    );
  });
});
