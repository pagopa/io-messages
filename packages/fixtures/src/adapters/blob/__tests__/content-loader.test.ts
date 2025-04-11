import { ContainerClient } from "@azure/storage-blob";
import { describe, expect, test, vi } from "vitest";

import { BlobContentLoader } from "../content-loader.js";

const uploadMock = vi.fn();
const getBlockBlobClientMock = vi.fn().mockReturnValue({ upload: uploadMock });

const messageContainerClientMock = {
  getBlockBlobClient: getBlockBlobClientMock,
} as unknown as ContainerClient;

const contentLoader = new BlobContentLoader(messageContainerClientMock);

describe("BlobContentLoader.generateMany", () => {
  test("should generate the correct number of message contents without remote content or payment_data", () => {
    const count = 2;
    const opts = { includePayments: false, includeRemoteContents: false };

    const result = contentLoader.generateMany(count, opts);
    expect(result).toHaveLength(count);
    result.forEach((content) => {
      expect(content.third_party_data).not.toBeDefined();
      expect(content.payment_data).not.toBeDefined();
    });
  });

  test("should include remote contents when specified", () => {
    const count = 2;
    const opts = { includePayments: false, includeRemoteContents: true };

    const result = contentLoader.generateMany(count, opts);

    result.forEach((content) => {
      expect(content.third_party_data).toBeDefined();
      expect(content.third_party_data).toEqual({
        configuration_id: "00000000000000000000000000",
        has_attachments: true,
        has_remote_content: false,
        id: expect.any(String),
      });
      expect(content.payment_data).not.toBeDefined();
    });
  });

  test("should include payment data when specified", () => {
    const count = 2;
    const opts = { includePayments: true, includeRemoteContents: false };

    const result = contentLoader.generateMany(count, opts);

    result.forEach((content) => {
      expect(content.payment_data).toBeDefined();
      expect(content.payment_data).toEqual({
        amount: 20000,
        invalid_after_due_date: false,
        notice_number: "396600003529000000",
        payee: { fiscal_code: "00000000001" },
      });
      expect(content.third_party_data).not.toBeDefined();
    });
  });
});

describe("BlobContentLoader.load", () => {
  test("should upload message contents to blob storage", async () => {
    const messageContents = [
      {
        content: "content1",
        markdown: "markdown1",
        messageId: "1",
        require_secure_channels: false,
        subject: "subject1",
      },
      {
        content: "content2",
        markdown: "markdown2",
        messageId: "2",
        require_secure_channels: false,
        subject: "subject2",
      },
    ];

    await contentLoader.load(messageContents);

    expect(getBlockBlobClientMock).toHaveBeenCalledTimes(2);
    expect(getBlockBlobClientMock).toHaveBeenCalledWith("1.json");
    expect(getBlockBlobClientMock).toHaveBeenCalledWith("2.json");

    const blockBlobClient = getBlockBlobClientMock("1.json");

    expect(blockBlobClient.upload).toHaveBeenCalledWith(
      JSON.stringify(messageContents[0]),
      JSON.stringify(messageContents[0]).length,
    );
    expect(blockBlobClient.upload).toHaveBeenCalledWith(
      JSON.stringify(messageContents[1]),
      JSON.stringify(messageContents[1]).length,
    );
  });
});
