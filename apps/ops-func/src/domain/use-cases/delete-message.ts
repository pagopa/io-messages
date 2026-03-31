import { AuditLogger, deleteMessageAuditLog } from "../audit.js";
import { MessageRepository } from "../message.js";

export class DeleteMessageUseCase {
  constructor(
    private repo: MessageRepository,
    private auditLogger: AuditLogger,
  ) {}

  async execute(fiscalCode: string, messageId: string): Promise<void> {
    await this.repo.deleteMessage(fiscalCode, messageId);
    await this.auditLogger.log(deleteMessageAuditLog(messageId));
  }
}
