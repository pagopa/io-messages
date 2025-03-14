import { pipe } from "fp-ts/lib/function";
import { aMessageStatus } from "../../__mocks__/message";
import { handleAvroMessageStatusPublishChange as handler } from "../handler";
import * as RA from "fp-ts/ReadonlyArray";
import { RetrievedMessageStatus } from "@pagopa/io-functions-commons/dist/src/models/message_status";
import {
  avroMessageStatusFormatter,
} from "../../utils/formatter/messageStatusAvroFormatter";
import { Producer, ProducerRecord } from "kafkajs";
import { KafkaProducerCompact } from "@pagopa/fp-ts-kafkajs/dist/lib/KafkaProducerCompact";
import { RejectedMessageStatusValueEnum } from "@pagopa/io-functions-commons/dist/generated/definitions/RejectedMessageStatusValue";

import { vi, beforeEach, describe, test, expect } from "vitest";

// ----------------------
// Variables
// ----------------------

const aTopic = "a-topic";
const aDocument = { name: "a-name" };
const anError = new Error("An error");
const aKafkaResponse = {
  errorCode: 0,
  partition: 1,
  topicName: aTopic
};

const mockSendMessage = vi.fn(async (pr: ProducerRecord) =>
  pipe(
    pr.messages,
    RA.map(() => aKafkaResponse)
  )
);

const messageFormatter = avroMessageStatusFormatter();
const producerMock: KafkaProducerCompact<RetrievedMessageStatus> = () => ({
  producer: ({
    connect: vi.fn(async () => void 0),
    disconnect: vi.fn(async () => void 0),
    send: mockSendMessage
  } as unknown) as Producer,
  topic: { topic: aTopic, messageFormatter }
});

const aListOfMessageStatus = pipe(
  Array.from({ length: 10 }, i => aMessageStatus)
);

const getExpectedMessageStatusBuffer = (
  messageStatuses: RetrievedMessageStatus[]
) => pipe(messageStatuses, RA.fromArray, RA.map(avroMessageStatusFormatter()));

// ----------------------
// Mocks
// ----------------------

const mockContext = { bindings: {}, done: vi.fn() } as any;

const resetBindings = () => {
  mockContext.bindings = {};
};

// ----------------------
// Tests
// ----------------------

describe("CosmosApiMessageStatusChangeFeedForReminder", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetBindings();
  });
  test("should send all retrieved message status", async () => {
    await handler(mockContext, producerMock, aListOfMessageStatus);

    expect(mockSendMessage).toHaveBeenCalledWith({
      messageFormatter,
      messages: getExpectedMessageStatusBuffer(aListOfMessageStatus),
      topic: aTopic
    });
  });

  test("should send only retrieved message status that can be decoded", async () => {
    await handler(mockContext, producerMock, [
      { ...aMessageStatus, status: "WRONG_STATUS" },
      ...aListOfMessageStatus
    ]);

    expect(mockSendMessage).toHaveBeenCalledWith({
      messageFormatter,
      messages: getExpectedMessageStatusBuffer(aListOfMessageStatus),
      topic: aTopic
    });
  });

  test("should send only PROCESSED retrieved message status", async () => {
    await handler(mockContext, producerMock, [
      { ...aMessageStatus, status: RejectedMessageStatusValueEnum.REJECTED },
      ...aListOfMessageStatus
    ]);

    expect(mockSendMessage).toHaveBeenCalledWith({
      messageFormatter,
      messages: getExpectedMessageStatusBuffer(aListOfMessageStatus),
      topic: aTopic
    });
  });

  test("should call sendMessage only if PROCESSED retrieved message status array is not empty", async () => {
    await handler(mockContext, producerMock, [
      { ...aMessageStatus, status: RejectedMessageStatusValueEnum.REJECTED }
    ]);

    expect(mockSendMessage).not.toHaveBeenCalled();
  });
});
