import { InvocationContext } from "@azure/functions";
import { QueueClient } from "@azure/storage-queue";
import { afterEach, describe, expect, test, vi } from "vitest";

import { splitDeleteMessage } from "../split-delete-messages.js";

const sendMessageMock = vi.fn();

const mockQueueClient = {
  sendMessage: sendMessageMock,
} as unknown as QueueClient;

const mockContext = {
  error: vi.fn(),
} as unknown as InvocationContext;

const handler = splitDeleteMessage(mockQueueClient);

afterEach(() => {
  vi.clearAllMocks();
});

const fiscalCode = "LVTEST00A00A197X";
const messageId = "01JR0NZGG4GYPY76NJ568MWGVC";

describe("splitDeleteMessage", () => {
  test("should send messages for valid input blob", async () => {
    const blob = Buffer.from(
      `${fiscalCode},${messageId}\n${fiscalCode},${messageId}`,
    );

    await handler(blob, mockContext);

    expect(sendMessageMock).toHaveBeenCalledTimes(2);
    expect(sendMessageMock).toHaveBeenCalledWith(
      Buffer.from(JSON.stringify({ fiscalCode, messageId })).toString("base64"),
    );
    expect(sendMessageMock).toHaveBeenCalledWith(
      Buffer.from(JSON.stringify({ fiscalCode, messageId })).toString("base64"),
    );
    expect(mockContext.error).not.toHaveBeenCalled();
  });

  test("should log an error for invalid blob input", async () => {
    const blob = Buffer.from("invalid_blob");

    await handler(blob, mockContext);

    expect(sendMessageMock).not.toHaveBeenCalled();
    expect(mockContext.error).toHaveBeenCalledWith(
      `Invalid pair fiscalCode: invalid_blob, messageId: undefined`,
    );
  });

  test("should skip lines with missing fiscalCode or messageId", async () => {
    const blob = Buffer.from(
      `${fiscalCode},${messageId}\ninvalidLine\nfiscalCode2,`,
    );

    await handler(blob, mockContext);

    expect(sendMessageMock).toHaveBeenCalledTimes(1);
    expect(sendMessageMock).toHaveBeenCalledWith(
      Buffer.from(JSON.stringify({ fiscalCode, messageId })).toString("base64"),
    );

    expect(mockContext.error).toHaveBeenCalledWith(
      `Invalid pair fiscalCode: fiscalCode2, messageId: `,
    );
  });

  test("should handle errors from sendMessage gracefully", async () => {
    const blob = Buffer.from("fiscalCode1,messageId1");
    sendMessageMock.mockRejectedValueOnce(new Error("Queue error"));

    await handler(blob, mockContext);

    expect(sendMessageMock).toHaveBeenCalledTimes(1);
    expect(mockContext.error).not.toHaveBeenCalled(); // No explicit error handling in the function
  });
});
