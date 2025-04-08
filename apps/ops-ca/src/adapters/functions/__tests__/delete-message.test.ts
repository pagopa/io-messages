import { vi, describe, test, expect, afterEach } from "vitest";
import { deleteMessages } from "../delete-message.js";
import { DeleteMessageUseCase } from "@/domain/use-cases/delete-message.js";
import { InvocationContext } from "@azure/functions";

const executeMock = vi.fn();

const mockDeleteMessageUseCase = {
  execute: executeMock,
} as unknown as DeleteMessageUseCase;

const mockContext = {
  error: vi.fn(),
} as unknown as InvocationContext;

afterEach(() => {
  vi.clearAllMocks();
});

const fiscalCode = "LVTEST00A00A197X";
const messageId = "01JR0NZGG4GYPY76NJ568MWGVC";

describe("deleteMessages", () => {
  const handler = deleteMessages(mockDeleteMessageUseCase);

  test("should call execute with trimmed fiscalCode and messageId for valid input", async () => {
    const input = {
      fiscalCode: " LVTEST00A00A197X ",
      messageId: " 01JR0NZGG4GYPY76NJ568MWGVC ",
    };

    await handler(input, mockContext);

    expect(mockDeleteMessageUseCase.execute).toHaveBeenCalledWith(
      fiscalCode,
      messageId,
    );
    expect(mockContext.error).not.toHaveBeenCalled();
  });

  test("should log an error for invalid input", async () => {
    const input = { fiscalCode: "", messageId: "" };

    await handler(input, mockContext);

    expect(mockDeleteMessageUseCase.execute).not.toHaveBeenCalled();
    expect(mockContext.error).toHaveBeenCalledWith(
      expect.stringContaining(`Invalid pair [fiscalCode, messageId]: ${input}`),
    );
  });

  test("should log an error for unexpected exceptions", async () => {
    const input = { fiscalCode, messageId };
    executeMock.mockRejectedValue(new Error("Unexpected error"));

    await expect(handler(input, mockContext)).resolves.toEqual(undefined);

    expect(mockDeleteMessageUseCase.execute).toHaveBeenCalledWith(
      fiscalCode,
      messageId,
    );

    expect(mockContext.error).toHaveBeenCalledWith(
      `Something went wrong trying to delete the message ${input}: Error: Unexpected error`,
    );
  });
});
