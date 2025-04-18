import { AuditLogger } from "@/domain/audit.js";
import { MessageRepository } from "@/domain/message.js";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { DeleteMessageUseCase } from "../delete-message.js";

const repo: MessageRepository = {
  deleteMessage: vi.fn(),
};

const auditLogger: AuditLogger = {
  log: vi.fn(),
};

describe("DeleteMessageUseCase", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("successful deletion", async () => {
    const deleteMessage = new DeleteMessageUseCase(repo, auditLogger);
    await expect(
      deleteMessage.execute("FISCAL_CODE", "MESSAGE_ID"),
    ).resolves.toBeUndefined();
    expect(repo.deleteMessage).toHaveBeenCalledWith(
      "FISCAL_CODE",
      "MESSAGE_ID",
    );
    expect(auditLogger.log).toHaveBeenCalledOnce();
  });

  test("failed deletion", async () => {
    const deleteMessage = new DeleteMessageUseCase(repo, auditLogger);
    vi.mocked(repo.deleteMessage).mockRejectedValueOnce(
      new Error("Deletion error"),
    );
    await expect(
      deleteMessage.execute("FISCAL_CODE", "MESSAGE_ID"),
    ).rejects.toThrowError();
    expect(repo.deleteMessage).toHaveBeenCalledWith(
      "FISCAL_CODE",
      "MESSAGE_ID",
    );
    expect(auditLogger.log).not.toHaveBeenCalled();
  });

  test("failed audit logging", async () => {
    const deleteMessage = new DeleteMessageUseCase(repo, auditLogger);
    vi.mocked(auditLogger.log).mockRejectedValueOnce(
      new Error("Audit logging error"),
    );
    await expect(
      deleteMessage.execute("FISCAL_CODE", "MESSAGE_ID"),
    ).rejects.toThrowError();
    expect(repo.deleteMessage).toHaveBeenCalledWith(
      "FISCAL_CODE",
      "MESSAGE_ID",
    );
    expect(auditLogger.log).toHaveBeenCalledOnce();
  });
});
