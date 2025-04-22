import { AuditLogger } from "@/domain/audit.js";
import { MessageRepository } from "@/domain/message.js";
import { DeleteMessageUseCase } from "@/domain/use-cases/delete-message.js";
import { InvocationContext } from "@azure/functions";
import { afterEach, describe, expect, test, vi } from "vitest";

import { deleteMessage } from "../delete-message.js";

const repo: MessageRepository = {
  deleteMessage: vi.fn(),
};

const auditLogger: AuditLogger = {
  log: vi.fn(),
};

const deleteMessageUseCase = new DeleteMessageUseCase(repo, auditLogger);

const context = new InvocationContext();
const ctxErrorSpy = vi.spyOn(context, "error");

afterEach(() => {
  vi.clearAllMocks();
});

const fiscalCode = "LVTEST00A00A197X";
const messageId = "01JR0NZGG4GYPY76NJ568MWGVC";

describe("deleteMessages", () => {
  const handler = deleteMessage(deleteMessageUseCase);

  test("should call execute with trimmed fiscalCode and messageId for valid input", async () => {
    const input = {
      fiscalCode: " LVTEST00A00A197X ",
      messageId: " 01JR0NZGG4GYPY76NJ568MWGVC ",
    };

    await handler(input, context);

    expect(repo.deleteMessage).toHaveBeenCalledWith(fiscalCode, messageId);
    expect(ctxErrorSpy).not.toHaveBeenCalled();
  });

  test("should log an error for invalid input", async () => {
    const input = { fiscalCode: "", messageId: "" };

    await handler(input, context);

    expect(repo.deleteMessage).not.toHaveBeenCalled();
    expect(ctxErrorSpy).toHaveBeenCalledWith(expect.any(String));
  });

  test("should log an error for unexpected exceptions", async () => {
    const input = { fiscalCode, messageId };

    vi.mocked(repo.deleteMessage).mockRejectedValue(
      new Error("Unexpected error"),
    );

    await expect(handler(input, context)).resolves.toEqual(undefined);

    expect(repo.deleteMessage).toHaveBeenCalledWith(fiscalCode, messageId);

    expect(ctxErrorSpy).toHaveBeenCalledWith(
      expect.any(String),
      expect.stringContaining(messageId),
      expect.any(String),
    );
  });
});
