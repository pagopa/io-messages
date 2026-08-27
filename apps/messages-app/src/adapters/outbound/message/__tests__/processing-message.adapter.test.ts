import {
  BlobServiceClient,
  BlockBlobUploadResponse,
  RestError,
} from "@azure/storage-blob";
import { GenericError } from "@pagopa/hexagonal-core";
import { fiscalCodeSchema } from "io-messages-common/domain/fiscal-code";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ProcessingMessagePayload } from "../../../../application/ports/processing-message.js";
import { BlobProcessingMessagePayloadStore } from "../processing-message.adapter.js";

const messageId = "01ARZ3NDEKTSV4RRFFQ69G5FAV";

const aProcessingMessagePayload: ProcessingMessagePayload = {
  content: {
    markdown:
      "A valid markdown, this should be more than 80 chars, otherwise an error occurs. Ensure that this line is long enough.",
    subject: "A valid subject used as title",
  },
  message: {
    createdAt: "2026-08-27T09:00:00.000Z",
    featureLevelType: "STANDARD",
    fiscalCode: fiscalCodeSchema.parse("SPNDNL80R13C555X"),
    id: messageId,
    indexedId: messageId,
    senderServiceId: "service-id",
    senderUserId: "sender-user-id",
    timeToLiveSeconds: 3600,
  },
  senderMetadata: {
    departmentName: "Department",
    organizationFiscalCode: "12345678901",
    organizationName: "Organization",
    requireSecureChannels: false,
    serviceCategory: "STANDARD",
    serviceName: "Service",
    serviceUserEmail: "service@example.com",
  },
};

const blobServiceClient = new BlobServiceClient(
  "https://fake.blob.core.windows.net",
);
const containerClient = blobServiceClient.getContainerClient(
  "processing-messages",
);
const blockBlobClient = containerClient.getBlockBlobClient(messageId);

const getContainerClientMock = vi
  .spyOn(blobServiceClient, "getContainerClient")
  .mockReturnValue(containerClient);
const getBlockBlobClientMock = vi
  .spyOn(containerClient, "getBlockBlobClient")
  .mockReturnValue(blockBlobClient);
const uploadMock = vi.spyOn(blockBlobClient, "upload");

const adapter = new BlobProcessingMessagePayloadStore(
  blobServiceClient,
  "processing-messages",
);

describe("BlobProcessingMessagePayloadStore", () => {
  beforeEach(() => {
    getContainerClientMock.mockClear();
    getBlockBlobClientMock.mockClear();
    uploadMock.mockReset();
    uploadMock.mockResolvedValue({} as BlockBlobUploadResponse);
  });

  it("stores the JSON payload using the message id as blob name", async () => {
    const result = await adapter.savePayload(aProcessingMessagePayload);
    const serializedPayload = JSON.stringify(aProcessingMessagePayload);

    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap()).toBeUndefined();
    expect(getBlockBlobClientMock).toHaveBeenCalledWith(messageId);
    expect(uploadMock).toHaveBeenCalledWith(
      serializedPayload,
      Buffer.byteLength(serializedPayload),
      {},
    );
  });

  it("returns GenericError when the Blob Storage upload fails", async () => {
    uploadMock.mockRejectedValue(
      new RestError("storage unavailable", { statusCode: 500 }),
    );

    const result = await adapter.savePayload(aProcessingMessagePayload);

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(GenericError);
    expect(result._unsafeUnwrapErr().message).toContain(messageId);
    expect(result._unsafeUnwrapErr().message).toContain("storage unavailable");
  });

  it("returns GenericError for non-Error upload failures", async () => {
    uploadMock.mockRejectedValue("unexpected failure");

    const result = await adapter.savePayload(aProcessingMessagePayload);

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(GenericError);
    expect(result._unsafeUnwrapErr().message).toContain("unexpected failure");
  });
});
