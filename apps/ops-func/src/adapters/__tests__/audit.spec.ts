import { deleteMessageAuditLog } from "@/domain/audit.js";
import { BlobServiceClient, ContainerClient } from "@azure/storage-blob";
import { describe, expect, test, vi } from "vitest";

import { BlobStorageAuditLogger } from "../audit.js";

const blobClient = BlobServiceClient.fromConnectionString(
  "UseDevelopmentStorage=true",
);

const uploadBlockBlobSpy = vi
  .spyOn(ContainerClient.prototype, "uploadBlockBlob")
  .mockImplementation(vi.fn());

describe("BlobStorageAuditLogger", () => {
  test("log audit log", async () => {
    const auditLogger = new BlobStorageAuditLogger(blobClient);
    const log = deleteMessageAuditLog("MESSAGE_ID");

    await expect(auditLogger.log(log)).resolves.toBeUndefined();
    const logBuffer = Buffer.from(JSON.stringify(log));

    expect(uploadBlockBlobSpy).toHaveBeenCalledWith(
      "MESSAGE_ID",
      logBuffer,
      logBuffer.length,
    );
  });

  test("fail on error uploading log", async () => {
    const auditLogger = new BlobStorageAuditLogger(blobClient);

    uploadBlockBlobSpy.mockRejectedValueOnce(new Error("Upload error"));

    await expect(
      auditLogger.log(deleteMessageAuditLog("MESSAGE_ID")),
    ).rejects.toThrowError(/log/);
  });
});
