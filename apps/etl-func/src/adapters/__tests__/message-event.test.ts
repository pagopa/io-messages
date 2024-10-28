import { aSimpleMessageEvent } from "@/__mocks__/message-event.js";
import { Logger } from "pino";
import { describe, expect, test, vi } from "vitest";

import {
  MessageEventAdapter,
  MessageProducerClient,
} from "../message-event.js";

const errorLogMock = vi.fn();

const loggerMock = {
  error: errorLogMock,
} as unknown as Logger;

const publishMessage = vi.fn();

const messageProducerClient: MessageProducerClient = {
  publishMessage,
};

const messageEventAdapter = new MessageEventAdapter(
  messageProducerClient,
  loggerMock,
);

//publishMessage to be called
//publishMessage to throw an error if the message event as a wrong schema
//publishMessage to throw an error

describe("publishMessageEvent", () => {
  test("Given a message event it should publish it", async () => {
    publishMessage.mockResolvedValueOnce(undefined);
    await expect(
      messageEventAdapter.publishMessageEvent(aSimpleMessageEvent),
    ).resolves.toEqual(undefined);
    expect(publishMessage).toHaveBeenCalledOnce();
  });
});
