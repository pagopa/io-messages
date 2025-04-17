import { BlobServiceClient, ContainerClient } from "@azure/storage-blob";
import { describe, expect, test, vi } from "vitest";

import { BlobStorageAuditLogger } from "../audit.js";
import { deleteMessageAuditLog } from "@/domain/audit.js";

const blobClient = BlobServiceClient.fromConnectionString(
  "UseDevelopmentStorage=true",
);

const uploadBlockBlobSpy = vi
  .spyOn(ContainerClient.prototype, "uploadBlockBlob")
  .mockImplementation(vi.fn());

describe("BlobStorageAuditLogger", () => {
  test("log audit log", async () => {
    const auditLogger = new BlobStorageAuditLogger(blobClient);

    await expect(
      auditLogger.log(deleteMessageAuditLog("MESSAGE_ID")),
    ).resolves.toBeUndefined();

    expect(uploadBlockBlobSpy).toHaveBeenCalled();
  });

  test("fail on error uploading log", async () => {
    const auditLogger = new BlobStorageAuditLogger(blobClient);

    uploadBlockBlobSpy.mockRejectedValueOnce(new Error("Upload error"));

    await expect(
      auditLogger.log(deleteMessageAuditLog("MESSAGE_ID")),
    ).rejects.toThrowError(/log/);
  });
});
