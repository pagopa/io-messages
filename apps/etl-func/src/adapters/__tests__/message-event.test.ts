import { aSimpleMessageEvent } from "@/__mocks__/message-event.js";
import { Logger } from "pino";
import { beforeEach, describe, expect, test, vi } from "vitest";

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

describe("publishMessageEvent", () => {
  beforeEach(() => {
    publishMessage.mockReset();
  });

  test("Given a message event it should publish it", async () => {
    publishMessage.mockResolvedValueOnce(undefined);
    await expect(
      messageEventAdapter.publishMessageEvent(aSimpleMessageEvent),
    ).resolves.toEqual(undefined);
    expect(publishMessage).toHaveBeenCalledOnce();
  });

  test("should throw if publishMessage throw an error", async () => {
    publishMessage.mockRejectedValueOnce(undefined);
    await expect(
      messageEventAdapter.publishMessageEvent(aSimpleMessageEvent),
    ).rejects.toEqual(undefined);
    expect(publishMessage).toHaveBeenCalledOnce();
  });
});
