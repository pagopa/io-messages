import type { Logger } from "@pagopa/hexagonal-core/domain/ports";

import { BlobServiceClient, RestError } from "@azure/storage-blob";
import {
  GenericError,
  NotFoundError,
  TooManyRequestsError,
} from "@pagopa/hexagonal-core";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { MalformedEntityError } from "../../../../application/ports/error.js";
import {
  MessageContent,
  messageContentSchema,
} from "../../../../application/ports/message-content.js";
import { MessageContentBlobAdapter } from "../message-content.adapter.js";

const aValidMessageContent: MessageContent = {
  due_date: "2026-08-31T12:00:00.000Z",
  markdown:
    "A valid markdown, this should be more than 80 chars, otherwise an error occurs. Ensure that this line is long enough.",
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

const trackEventMock = vi.fn();

const adapter = new MessageContentBlobAdapter(blobServiceClient, "messages", {
  trackEvent: trackEventMock,
} as unknown as Logger);

describe("getMessagesContentByIds", () => {
  beforeEach(() => {
    downloadToBufferMock.mockReset();
    downloadToBufferMock.mockImplementation(() =>
      Promise.resolve(aValidBuffer),
    );
    trackEventMock.mockReset();
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
    expect(trackEventMock).not.toHaveBeenCalled();
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
    expect(trackEventMock).not.toHaveBeenCalled();
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
    expect(trackEventMock).toHaveBeenCalledTimes(1);
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
    expect(trackEventMock).toHaveBeenCalledTimes(1);
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
    expect(trackEventMock).not.toHaveBeenCalled();
  });

  it("fails the whole operation with a TooManyRequestsError on throttling", async () => {
    downloadToBufferMock.mockImplementation(() =>
      Promise.reject(new RestError("throttled", { statusCode: 429 })),
    );

    const result = await adapter.getMessagesContentByIds(["id-1"]);
    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(TooManyRequestsError);
    expect(trackEventMock).not.toHaveBeenCalled();
  });

  it("fails the whole operation with a GenericError on unexpected RestError status", async () => {
    downloadToBufferMock.mockImplementation(() =>
      Promise.reject(new RestError("boom", { statusCode: 500 })),
    );

    const result = await adapter.getMessagesContentByIds(["id-1"]);
    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(GenericError);
    expect(trackEventMock).not.toHaveBeenCalled();
  });

  it("fails the whole operation with a GenericError on non-RestError failures", async () => {
    downloadToBufferMock.mockImplementation(() =>
      Promise.reject(new Error("unexpected")),
    );

    const result = await adapter.getMessagesContentByIds(["id-1"]);
    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(GenericError);
    expect(trackEventMock).not.toHaveBeenCalled();
  });
});

describe("getMessageContentById", () => {
  beforeEach(() => {
    downloadToBufferMock.mockReset();
    downloadToBufferMock.mockImplementation(() =>
      Promise.resolve(aValidBuffer),
    );
    trackEventMock.mockReset();
  });

  it("returns the content for an existing valid message", async () => {
    const result = await adapter.getMessageContentById("id-1");

    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap()).toEqual(aValidMessageContent);
    expect(trackEventMock).not.toHaveBeenCalled();
  });

  it.each([null, undefined, false, true])(
    "normalizes legacy boolean defaults for %j",
    async (value) => {
      const content = {
        ...aValidMessageContent,
        payment_data: {
          amount: 1,
          invalid_after_due_date: value,
          notice_number: "012345678901234567",
        },
        third_party_data: {
          has_attachments: value,
          has_remote_content: value,
          id: "external-message",
        },
      };
      downloadToBufferMock.mockResolvedValue(
        Buffer.from(JSON.stringify(content)),
      );

      const result = await adapter.getMessageContentById("id-1");
      const expected = value ?? false;

      expect(result._unsafeUnwrap()).toMatchObject({
        payment_data: { invalid_after_due_date: expected },
        third_party_data: {
          has_attachments: expected,
          has_remote_content: expected,
        },
      });
      const parsedContent = messageContentSchema.parse(content);
      expect(parsedContent).toEqual(result._unsafeUnwrap());
    },
  );

  it.each([
    { payment_data: { amount: 0, notice_number: "012345678901234567" } },
    { due_date: "not-a-date" },
    { due_date: "2026-02-30T12:00:00Z" },
    {
      third_party_data: {
        id: "external-message",
        original_receipt_date: "not-a-date",
      },
    },
  ])("rejects malformed legacy content %j", async (properties) => {
    const content = { ...aValidMessageContent, ...properties };
    downloadToBufferMock.mockResolvedValue(
      Buffer.from(JSON.stringify(content)),
    );

    const result = await adapter.getMessageContentById("id-1");

    expect(result._unsafeUnwrapErr()).toBeInstanceOf(MalformedEntityError);
    expect(messageContentSchema.safeParse(content).success).toBe(false);
  });

  it.each(["2026-08-31T12:00:00Z", "2026-08-31T14:00:00+02:00"])(
    "normalizes date strings to UTC for %s",
    async (date) => {
      const content = {
        ...aValidMessageContent,
        due_date: date,
        third_party_data: {
          id: "external-message",
          original_receipt_date: date,
        },
        timestamp: "2026-08-31T12:00:00Z",
      };
      downloadToBufferMock.mockResolvedValue(
        Buffer.from(JSON.stringify(content)),
      );

      const result = await adapter.getMessageContentById("id-1");

      expect(result._unsafeUnwrap()).toMatchObject({
        due_date: "2026-08-31T12:00:00.000Z",
        third_party_data: {
          original_receipt_date: "2026-08-31T12:00:00.000Z",
        },
      });
      expect(result._unsafeUnwrap()).not.toHaveProperty("timestamp");
      expect(messageContentSchema.parse(content)).toEqual(
        result._unsafeUnwrap(),
      );
    },
  );

  it("keeps the agreed support for an empty payee and a retired Covid payload", async () => {
    downloadToBufferMock.mockResolvedValue(
      Buffer.from(
        JSON.stringify({
          ...aValidMessageContent,
          eu_covid_cert: {},
          payment_data: {
            amount: 1,
            notice_number: "012345678901234567",
            payee: {},
          },
        }),
      ),
    );

    const result = await adapter.getMessageContentById("id-1");

    expect(result._unsafeUnwrap()).toMatchObject({
      eu_covid_cert: {},
      payment_data: { payee: {} },
    });
  });

  it("returns a NotFoundError when the blob does not exist", async () => {
    downloadToBufferMock.mockImplementation(() =>
      Promise.reject(new RestError("not found", { statusCode: 404 })),
    );

    const result = await adapter.getMessageContentById("missing");

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(NotFoundError);
    expect(trackEventMock).not.toHaveBeenCalled();
  });

  it("returns a MalformedEntityError when the content is invalid", async () => {
    downloadToBufferMock.mockImplementation(() =>
      Promise.resolve(Buffer.from(JSON.stringify({ subject: "" }))),
    );

    const result = await adapter.getMessageContentById("malformed");

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(MalformedEntityError);
    expect(trackEventMock).toHaveBeenCalledTimes(1);
  });

  it("returns a MalformedEntityError when the buffer is not valid JSON", async () => {
    downloadToBufferMock.mockImplementation(() =>
      Promise.resolve(Buffer.from("not-a-json")),
    );

    const result = await adapter.getMessageContentById("broken-json");

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(MalformedEntityError);
    expect(trackEventMock).toHaveBeenCalledTimes(1);
  });

  it("returns a TooManyRequestsError on throttling", async () => {
    downloadToBufferMock.mockImplementation(() =>
      Promise.reject(new RestError("throttled", { statusCode: 429 })),
    );

    const result = await adapter.getMessageContentById("id-1");

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(TooManyRequestsError);
    expect(trackEventMock).not.toHaveBeenCalled();
  });

  it("returns a GenericError on an unexpected RestError status", async () => {
    downloadToBufferMock.mockImplementation(() =>
      Promise.reject(new RestError("boom", { statusCode: 500 })),
    );

    const result = await adapter.getMessageContentById("id-1");

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(GenericError);
    expect(trackEventMock).not.toHaveBeenCalled();
  });

  it("returns a GenericError on non-RestError failures", async () => {
    downloadToBufferMock.mockImplementation(() =>
      Promise.reject(new Error("unexpected")),
    );

    const result = await adapter.getMessageContentById("id-1");

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(GenericError);
    expect(trackEventMock).not.toHaveBeenCalled();
  });
});
