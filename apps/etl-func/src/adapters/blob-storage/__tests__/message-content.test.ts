import { BlobMessageContent } from "../message-content.js";
import { describe, test, expect, vi } from "vitest";
import { Readable } from "node:stream";
import * as z from "zod";
import { RestError } from "@azure/storage-blob";
import { Message, messageMetadataSchema } from "@/domain/entities/message.js";

const mocks = vi.hoisted(() => {
  return {
    BlobServiceClient: vi.fn().mockReturnValue({
      getContainerClient: () => ({
        getBlobClient: () => ({
          download: downloadMock,
        }),
      }),
    }),
  };
});

vi.mock("@azure/storage-blob", async (importOriginal) => {
  const original = await importOriginal<typeof import("@azure/storage-blob")>();
  return {
    ...original,
    BlobServiceClient: mocks.BlobServiceClient,
  };
});

const aSimpleMessageMetadata = messageMetadataSchema.parse({
  id: "01EHA1R1TSJP8DNYYG2TTR1B28",
  indexedId: "01EHA1R1TTJG01AHEDQEFNHFS9",
  fiscalCode: "RMLGNN97R06F158N",
  createdAt: "2020-05-11T22:59:50.221Z",
  senderServiceId: "synthesizing",
  senderUserId: "interface",
  isPending: false,
  timeToLiveSeconds: 6125,
  _rid: "Xl0hAOfz93oCAAAAAAAAAA==",
  _self: "dbs/Xl0hAA==/colls/Xl0hAOfz93o=/docs/Xl0hAOfz93oCAAAAAAAAAA==/",
  _etag: '"00009e2f-0000-5b00-0000-6686a02b0000"',
  _attachments: "attachments/",
  _ts: 1720098859,
});

const aSimpleMessageContent = {
  subject: "A valid subject, this is used as title",
  markdown:
    "A valid markdown, this should be more than 80 chars, otherwise an error occurs. Ensure that this line is more than 80 chars",
  senderMetadata: {
    service_name: "ServiceName",
    organization_name: "OrganizationName",
    department_name: "DepartmentName",
  },
  message: {
    createdAt: "Timestamp",
    featureLevelType: "STANDARD",
    fiscalCode: "RMLGNN97R06F158N",
    indexedId: "01EHA1R1TSJP8DNYYG2TTR1B28",
    senderServiceId: "synthesizing",
    senderUserId: "NonEmptyString",
    timeToLiveSeconds: -1,
  },
};

const anInvalidMessageContent = {
  ...aSimpleMessageContent,
  subject: "",
};

//TODO: move this to a specific mock file
const downloadMock = vi.fn(() =>
  Promise.resolve({
    readableStreamBody: Readable.from(JSON.stringify(aSimpleMessageContent)),
  }),
);

const storageUri = "http://storageuri";
const contaienrName = "message-container-name";
const blobMessageContent = new BlobMessageContent(storageUri, contaienrName);

const anExistingMessageId = "01EHA1R1TSJP8DNYYG2TTR1B28";

describe("getMessageContentById", () => {
  test("Given a message id which refers to an existing message, when the storage is reachable then it should return the content of the message", async () => {
    expect(
      await blobMessageContent.getMessageContentById(anExistingMessageId),
    ).toMatchObject({
      subject: "A valid subject, this is used as title",
      markdown:
        "A valid markdown, this should be more than 80 chars, otherwise an error occurs. Ensure that this line is more than 80 chars",
      require_secure_channels: false,
    });
  });

  test("Given a message id which refers to an existing message, when the storage is not reachable then it should throw an error", async () => {
    downloadMock.mockReturnValueOnce(Promise.reject());
    await expect(
      blobMessageContent.getMessageContentById(anExistingMessageId),
    ).rejects.toThrowError();
  });

  test("Given a message id which refers to an existing message, when the storage is reachable then it should return an error if the message content does not match the decoder", async () => {
    downloadMock.mockReturnValueOnce(
      Promise.resolve({
        readableStreamBody: Readable.from(
          JSON.stringify(anInvalidMessageContent),
        ),
      }),
    );
    expect(
      await blobMessageContent.getMessageContentById(anExistingMessageId),
    ).toBeInstanceOf(z.ZodError);
  });

  test("Given a message id which refers to a non existing message, when the storage is reachable then it should return a RestError with code 404", async () => {
    downloadMock.mockReturnValueOnce(
      Promise.reject(
        new RestError("The specified blob does not exist.", {
          code: "BlobNotFound",
          statusCode: 404,
        }),
      ),
    );
    const r =
      await blobMessageContent.getMessageContentById(anExistingMessageId);
    expect(r).toBeInstanceOf(RestError);
    if (r instanceof RestError) {
      expect(r.statusCode).toBe(404);
    }
  });
});

describe("getMessageByMetadata", () => {
  test("Given a message metadata, when the metadata contains a messageId which refers to an existing message, then it should return a new Message", async () => {
    const r = await blobMessageContent.getMessageByMetadata(
      aSimpleMessageMetadata,
    );
    expect(r).toBeInstanceOf(Message);
  });

  test("Given message metadata, when the storage is not reachable then it should throw an error", async () => {
    downloadMock.mockReturnValueOnce(Promise.reject());
    await expect(
      blobMessageContent.getMessageByMetadata(aSimpleMessageMetadata),
    ).rejects.toThrowError();
  });

  test("Given message metadata, when the related message-content does not exist, then it should return a RestError with code 404", async () => {
    downloadMock.mockReturnValueOnce(
      Promise.reject(
        new RestError("The specified blob does not exist.", {
          code: "BlobNotFound",
          statusCode: 404,
        }),
      ),
    );

    const r = await blobMessageContent.getMessageByMetadata(
      aSimpleMessageMetadata,
    );
    expect(r).toBeInstanceOf(RestError);
    if (r instanceof RestError) {
      expect(r.statusCode).toBe(404);
    }
  });
});
