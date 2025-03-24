import { describe, test, expect, vi } from "vitest";
import { BlobContentLoader } from "../content-loader.js";
import { ContainerClient } from "@azure/storage-blob";

const uploadMock = vi.fn();
const getBlockBlobClientMock = vi.fn().mockReturnValue({ upload: uploadMock });

const messageContainerClientMock = {
  getBlockBlobClient: getBlockBlobClientMock,
} as unknown as ContainerClient;

const contentLoader = new BlobContentLoader(messageContainerClientMock);

describe("ContentLoader", () => {
  test("should generate the correct number of message contents without remote content or payment_data", () => {
    const count = 2;
    const opts = { includeRemoteContents: false, includePayments: false };

    const result = contentLoader.generateMany(count, opts);
    expect(result).toHaveLength(count);
    result.forEach((content) => {
      expect(content.third_party_data).not.toBeDefined();
      expect(content.payment_data).not.toBeDefined();
    });
  });

  test("should include remote contents when specified", () => {
    const count = 2;
    const opts = { includeRemoteContents: true, includePayments: false };

    const result = contentLoader.generateMany(count, opts);

    result.forEach((content) => {
      expect(content.third_party_data).toBeDefined();
      expect(content.third_party_data).toEqual({
        id: expect.any(String),
        has_attachments: true,
        configuration_id: "00000000000000000000000000",
        has_remote_content: false,
      });
      expect(content.payment_data).not.toBeDefined();
    });
  });

  test("should include payment data when specified", () => {
    const count = 2;
    const opts = { includeRemoteContents: false, includePayments: true };

    const result = contentLoader.generateMany(count, opts);

    result.forEach((content) => {
      expect(content.payment_data).toBeDefined();
      expect(content.payment_data).toEqual({
        amount: 20000,
        notice_number: "396600003529000000",
        invalid_after_due_date: false,
        payee: { fiscal_code: "00000000001" },
      });
      expect(content.third_party_data).not.toBeDefined();
    });
  });
});
