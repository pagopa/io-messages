import { AuditLogger, deleteMessageAuditLog } from "@/domain/audit.js";
import { MessageRepository } from "@/domain/message.js";

export class DeleteMessageUseCase {
  constructor(
    private repo: MessageRepository,
    private auditLogger: AuditLogger,
  ) {}

  async execute(fiscalCode: string, messageId: string): Promise<void> {
    try {
      await this.repo.deleteMessage(fiscalCode, messageId);
      await this.auditLogger.log(deleteMessageAuditLog(messageId));
    } catch {
      throw new Error(`Failed to delete message`);
    }
  }
}
