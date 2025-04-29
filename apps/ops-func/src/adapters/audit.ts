import { AuditLog, AuditLogger } from "@/domain/audit.js";
import { BlobServiceClient, ContainerClient } from "@azure/storage-blob";

export class BlobStorageAuditLogger implements AuditLogger {
  #logs: ContainerClient;

  constructor(blobServiceClient: BlobServiceClient) {
    this.#logs = blobServiceClient.getContainerClient("audit-logs");
  }

  async log(a: AuditLog): Promise<void> {
    try {
      const body = Buffer.from(JSON.stringify(a));
      await this.#logs.uploadBlockBlob(a.messageId, body, body.length);
    } catch (e) {
      throw new Error("Failed to log deleted message", {
        cause: e,
      });
    }
  }
}
