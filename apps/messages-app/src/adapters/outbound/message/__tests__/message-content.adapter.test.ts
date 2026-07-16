import { BlobServiceClient, RestError } from "@azure/storage-blob";
import {
  GenericError,
  NotFoundError,
  TooManyRequestsError,
} from "@pagopa/hexagonal-core";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { MalformedEntityError } from "../../../../application/ports/error.js";
import { MessageContent } from "../../../../application/ports/message-content.js";
import { MessageContentBlobAdapter } from "../message-content.adapter.js";

const aValidMessageContent: MessageContent = {
  markdown:
    "A valid markdown, this should be more than 80 chars, otherwise an error occurs. Ensure that this line is long enough.",
  require_secure_channels: false,
  subject: "A valid subject used as title",
};

const aValidBuffer = Buffer.from(JSON.stringify(aValidMessageContent));

const blobServiceClient = new BlobServiceClient(
  "https://fake.blob.core.windows.net",
);

const containerClient = blobServiceClient.getContainerClient("message-content");

const blobClient = containerClient.getBlobClient("placeholder.json");

vi.spyOn(blobServiceClient, "getContainerClient").mockReturnValue(
  containerClient,
);

vi.spyOn(containerClient, "getBlobClient").mockReturnValue(blobClient);

const downloadToBufferMock = vi
  .spyOn(blobClient, "downloadToBuffer")
  .mockImplementation(() => Promise.resolve(aValidBuffer));

const adapter = new MessageContentBlobAdapter(blobServiceClient, "messages");

describe("getMessagesContentByIds", () => {
  beforeEach(() => {
    downloadToBufferMock.mockReset();
    downloadToBufferMock.mockImplementation(() =>
      Promise.resolve(aValidBuffer),
    );
  });

  it("returns the content for each existing and valid message", async () => {
    const result = await adapter.getMessagesContentByIds(["id-1", "id-2"]);

    expect(result.isOk()).toBe(true);
    const contentById = result._unsafeUnwrap();

    expect(contentById.size).toBe(2);
    expect(contentById.get("id-1")?._unsafeUnwrap()).toEqual(
      aValidMessageContent,
    );
    expect(contentById.get("id-2")?._unsafeUnwrap()).toEqual(
      aValidMessageContent,
    );
  });

  it("reports a NotFoundError per-item when the blob does not exist", async () => {
    downloadToBufferMock.mockImplementation(() =>
      Promise.reject(new RestError("not found", { statusCode: 404 })),
    );

    const result = await adapter.getMessagesContentByIds(["missing"]);
    expect(result.isOk()).toBe(true);

    const entry = result._unsafeUnwrap().get("missing");
    expect(entry?.isErr()).toBe(true);
    expect(entry?._unsafeUnwrapErr()).toBeInstanceOf(NotFoundError);
  });

  it("reports a MalformedEntityError per-item when the content is invalid", async () => {
    downloadToBufferMock.mockImplementation(() =>
      Promise.resolve(Buffer.from(JSON.stringify({ subject: "" }))),
    );

    const result = await adapter.getMessagesContentByIds(["malformed"]);
    expect(result.isOk()).toBe(true);

    const entry = result._unsafeUnwrap().get("malformed");
    expect(entry?.isErr()).toBe(true);
    expect(entry?._unsafeUnwrapErr()).toBeInstanceOf(MalformedEntityError);
  });

  it("reports a MalformedEntityError per-item when the buffer is not valid JSON", async () => {
    downloadToBufferMock.mockImplementation(() =>
      Promise.resolve(Buffer.from("not-a-json")),
    );

    const result = await adapter.getMessagesContentByIds(["broken-json"]);
    expect(result.isOk()).toBe(true);

    const entry = result._unsafeUnwrap().get("broken-json");
    expect(entry?.isErr()).toBe(true);
    expect(entry?._unsafeUnwrapErr()).toBeInstanceOf(MalformedEntityError);
  });

  it("collects both valid and skippable-error entries in the same map", async () => {
    downloadToBufferMock.mockImplementationOnce(() =>
      Promise.resolve(aValidBuffer),
    );
    downloadToBufferMock.mockImplementationOnce(() =>
      Promise.reject(new RestError("not found", { statusCode: 404 })),
    );

    const result = await adapter.getMessagesContentByIds(["ok-id", "missing"]);
    expect(result.isOk()).toBe(true);

    const contentById = result._unsafeUnwrap();
    expect(contentById.get("ok-id")?.isOk()).toBe(true);
    expect(contentById.get("missing")?._unsafeUnwrapErr()).toBeInstanceOf(
      NotFoundError,
    );
  });

  it("fails the whole operation with a TooManyRequestsError on throttling", async () => {
    downloadToBufferMock.mockImplementation(() =>
      Promise.reject(new RestError("throttled", { statusCode: 429 })),
    );

    const result = await adapter.getMessagesContentByIds(["id-1"]);
    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(TooManyRequestsError);
  });

  it("fails the whole operation with a GenericError on unexpected RestError status", async () => {
    downloadToBufferMock.mockImplementation(() =>
      Promise.reject(new RestError("boom", { statusCode: 500 })),
    );

    const result = await adapter.getMessagesContentByIds(["id-1"]);
    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(GenericError);
  });

  it("fails the whole operation with a GenericError on non-RestError failures", async () => {
    downloadToBufferMock.mockImplementation(() =>
      Promise.reject(new Error("unexpected")),
    );

    const result = await adapter.getMessagesContentByIds(["id-1"]);
    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(GenericError);
  });
});
