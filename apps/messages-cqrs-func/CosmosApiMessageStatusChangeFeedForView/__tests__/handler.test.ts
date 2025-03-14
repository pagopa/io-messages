import { pipe } from "fp-ts/lib/function";
import { aMessageStatus } from "../../__mocks__/message";
import { handleMessageStatusChangeFeedForView as handler } from "../handler";
import * as KP from "@pagopa/fp-ts-kafkajs/dist/lib/KafkaProducerCompact";
import * as TE from "fp-ts/TaskEither";
import * as E from "fp-ts/Either";

import { vi, beforeEach, describe, test, expect } from "vitest";

// ----------------------
// Variables
// ----------------------

const kafkaClient = {} as any;

const aListOfMessageStatus = pipe(
  Array.from({ length: 10 }, i => aMessageStatus)
);

const sendMessagesMock = vi.fn().mockImplementation(_ => TE.right([]));

vi.spyOn(KP, "sendMessages").mockImplementation(_ => sendMessagesMock);

// ----------------------
// Mocks
// ----------------------

const mockContext = { bindings: {}, done: vi.fn() } as any;

// ----------------------
// Tests
// ----------------------

describe("CosmosApiMessageStatusChangeFeedForView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  test("should send all retrieved message status", async () => {
    const res = await handler(mockContext, aListOfMessageStatus, kafkaClient);
    expect(res).toBe(void 0);
  });

  test("should send only retrieved message status that can be decoded", async () => {
    const res = await handler(
      mockContext,
      [{ ...aMessageStatus, status: "WRONG_STATUS" }, ...aListOfMessageStatus],
      kafkaClient
    );
    expect(sendMessagesMock).toBeCalledTimes(1);
    expect(res).toBe(void 0);
  });

  test("should throw if messages cannot be published on event hub topic", async () => {
    sendMessagesMock.mockImplementationOnce(() =>
      TE.left([{ body: aMessageStatus }])
    );
    await pipe(
      TE.tryCatch(
        () => handler(mockContext, aListOfMessageStatus, kafkaClient),
        E.toError
      ),
      TE.mapLeft(error =>
        expect(error.message).toEqual("Cannot publish to Kafka topic")
      )
    )();
  });
});
