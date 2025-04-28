import { InvocationContext, StorageQueueOutput } from "@azure/functions";
import { afterEach, describe, expect, test, vi } from "vitest";

import { splitDeleteMessages } from "../split-delete-messages.js";

const setMock = vi.fn();

const mockContext = {
  error: vi.fn(),
  extraOutputs: { set: setMock },
} as unknown as InvocationContext;

const queueOutputMock = {} as StorageQueueOutput;

const handler = splitDeleteMessages(queueOutputMock);

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

    expect(setMock).toHaveBeenCalledTimes(1);
    expect(setMock).toHaveBeenCalledWith(queueOutputMock, [
      {
        fiscalCode,
        messageId,
      },
      {
        fiscalCode,
        messageId,
      },
    ]);
  });

  test("should log an error for invalid blob input", async () => {
    const blob = Buffer.from("invalid_blob");

    await handler(blob, mockContext);

    expect(setMock).not.toHaveBeenCalled();
    expect(mockContext.error).toHaveBeenCalledWith(`Unable to parse line 1`);
  });

  test("should skip lines with missing fiscalCode or messageId", async () => {
    const blob = Buffer.from(
      `${fiscalCode},${messageId}\ninvalidLine\nfiscalCode2,`,
    );

    await handler(blob, mockContext);

    expect(setMock).toHaveBeenCalledWith(queueOutputMock, [
      { fiscalCode, messageId },
    ]);

    expect(mockContext.error).toHaveBeenCalledWith(
      expect.stringContaining("Unable to parse line"),
    );
  });

  test("should handle errors from sendMessage gracefully", async () => {
    const blob = Buffer.from("fiscalCode1,messageId1");
    setMock.mockRejectedValueOnce(new Error("Queue error"));

    await handler(blob, mockContext);

    expect(setMock).toHaveBeenCalledTimes(1);
    expect(mockContext.error).not.toHaveBeenCalled(); // No explicit error handling in the function
  });
});
