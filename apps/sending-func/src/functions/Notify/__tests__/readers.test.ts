import { createClient } from "@/generated/session-manager/client";
import { ErrorResponse } from "@azure/cosmos";
import { MessageModel } from "@pagopa/io-functions-commons/dist/src/models/message";
import { ServiceModel } from "@pagopa/io-functions-commons/dist/src/models/service";
import { BlobService } from "azure-storage";
import * as E from "fp-ts/Either";
import * as O from "fp-ts/Option";
import * as TE from "fp-ts/TaskEither";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  aFiscalCode,
  aMessageContent,
  aRetrievedMessage,
  aRetrievedMessageWithContent,
  aRetrievedService,
} from "../../../__mocks__/models.mock";
import {
  getMessageWithContent,
  getService,
  getUserSessionStatusReader,
} from "../readers";

const findOneByServiceIdMock = vi.fn(
  () =>
    TE.of(O.some(aRetrievedService)) as ReturnType<
      ServiceModel["findLastVersionByModelId"]
    >,
);

const serviceModelMock = {
  findOneByServiceId: findOneByServiceIdMock,
} as unknown as ServiceModel;

const findMessageForRecipientMock = vi
  .fn()
  .mockImplementation(() => TE.of(O.some(aRetrievedMessage)));

const getContentFromBlobMock = vi
  .fn()
  .mockImplementation(() => TE.of(O.some(aMessageContent)));
const messageModelMock = {
  findMessageForRecipient: findMessageForRecipientMock,
  getContentFromBlob: getContentFromBlobMock,
} as unknown as MessageModel;

const anActiveSession = { active: true };

const getSessionMock = vi
  .fn()
  .mockImplementation(async () =>
    E.right({ header: [], status: 200, value: anActiveSession }),
  );

const sessionClientMock: ReturnType<typeof createClient> = {
  authLock: vi.fn(),
  deleteUserSession: vi.fn(),
  getSession: getSessionMock,
  getUserSessionState: vi.fn(),
  info: vi.fn(),
  lockUserSession: vi.fn(),
  releaseAuthLock: vi.fn(),
  unlockUserSession: vi.fn(),
};

// -----------------------------
// Tests
// -----------------------------

describe("ServiceReader", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return the existing service", async () => {
    const serviceReader = getService(serviceModelMock);

    const result = await serviceReader(aRetrievedService.id)();
    expect(result).toEqual(E.right(aRetrievedService));
  });

  it("should return IResponseErrorNotFound if service does not exists", async () => {
    findOneByServiceIdMock.mockImplementationOnce(() => TE.of(O.none));
    const serviceReader = getService(serviceModelMock);

    const result = await serviceReader(aRetrievedService.id)();
    expect(result).toMatchObject(
      E.left({
        detail: `Service not found: Service ${aRetrievedService.id} was not found in the system.`,
        kind: "IResponseErrorNotFound",
      }),
    );
  });

  it("should return IResponseErrorInternal if an error occurred", async () => {
    findOneByServiceIdMock.mockImplementationOnce(() =>
      TE.left({ error: {} as ErrorResponse, kind: "COSMOS_ERROR_RESPONSE" }),
    );
    const serviceReader = getService(serviceModelMock);

    const result = await serviceReader(aRetrievedService.id)();
    expect(result).toMatchObject(
      E.left({
        detail: `Internal server error: Error while retrieving the service`,
        kind: "IResponseErrorInternal",
      }),
    );
  });
});

describe("MessageWithContentReader", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return the existing message with its content", async () => {
    const messageReader = getMessageWithContent(
      messageModelMock,
      {} as BlobService,
    );

    const result = await messageReader(aFiscalCode, aRetrievedMessage.id)();
    expect(result).toEqual(E.right(aRetrievedMessageWithContent));
  });

  it("should return IResponseErrorNotFound if message metadata does not exists", async () => {
    findMessageForRecipientMock.mockImplementationOnce(() => TE.of(O.none));
    const messageReader = getMessageWithContent(
      messageModelMock,
      {} as BlobService,
    );

    const result = await messageReader(aFiscalCode, aRetrievedMessage.id)();
    expect(result).toMatchObject(
      E.left({
        detail: `Message not found: Message ${aRetrievedMessage.id} was not found for the given Fiscal Code`,
        kind: "IResponseErrorNotFound",
      }),
    );
  });

  it("should return IResponseErrorNotFound if message content does not exists", async () => {
    getContentFromBlobMock.mockImplementationOnce(() => TE.of(O.none));
    const messageReader = getMessageWithContent(
      messageModelMock,
      {} as BlobService,
    );

    const result = await messageReader(aFiscalCode, aRetrievedMessage.id)();
    expect(result).toMatchObject(
      E.left({
        detail: `Message content not found: Content of message ${aRetrievedMessage.id} was not found for the given Fiscal Code`,
        kind: "IResponseErrorNotFound",
      }),
    );
  });

  it("should return IResponseErrorInternal if an error occurred retrieving message metadata", async () => {
    findMessageForRecipientMock.mockImplementationOnce(() => TE.left({}));
    const messageReader = getMessageWithContent(
      messageModelMock,
      {} as BlobService,
    );

    const result = await messageReader(aFiscalCode, aRetrievedMessage.id)();
    expect(result).toMatchObject(
      E.left({
        detail: `Internal server error: Error while retrieving the message metadata`,
        kind: "IResponseErrorInternal",
      }),
    );
  });

  it("should return IResponseErrorInternal if an error occurred retrieving message content", async () => {
    getContentFromBlobMock.mockImplementationOnce(() => TE.left({}));
    const messageReader = getMessageWithContent(
      messageModelMock,
      {} as BlobService,
    );

    const result = await messageReader(aFiscalCode, aRetrievedMessage.id)();
    expect(result).toMatchObject(
      E.left({
        detail: `Internal server error: Error while retrieving the message`,
        kind: "IResponseErrorInternal",
      }),
    );
  });
});

describe("SessionStatusReader", () => {
  it("should return the existing user session status", async () => {
    const userSessionStatusReader =
      getUserSessionStatusReader(sessionClientMock);

    const result = await userSessionStatusReader(aFiscalCode)();
    expect(result).toEqual(E.right(anActiveSession));
  });

  it("should return IResponseErrorInternal if an error occurred", async () => {
    getSessionMock.mockImplementationOnce(async () => {
      throw Error("");
    });
    const userSessionStatusReader =
      getUserSessionStatusReader(sessionClientMock);

    const result = await userSessionStatusReader(aFiscalCode)();
    expect(result).toMatchObject(
      E.left({
        detail: `Internal server error: Error retrieving user session`,
        kind: "IResponseErrorInternal",
      }),
    );
  });

  it("should return IResponseErrorInternal if validation fails", async () => {
    getSessionMock.mockImplementationOnce(async () => E.left({}));
    const userSessionStatusReader =
      getUserSessionStatusReader(sessionClientMock);

    const result = await userSessionStatusReader(aFiscalCode)();
    expect(result).toMatchObject(
      E.left({
        detail: `Internal server error: Error decoding user session`,
        kind: "IResponseErrorInternal",
      }),
    );
  });

  it("should return IResponseErrorInternal if response status code is not 200", async () => {
    getSessionMock.mockImplementationOnce(async () =>
      E.right({ header: [], status: 400, value: {} }),
    );
    const userSessionStatusReader =
      getUserSessionStatusReader(sessionClientMock);

    const result = await userSessionStatusReader(aFiscalCode)();
    expect(result).toMatchObject(
      E.left({
        detail: `Internal server error: Error retrieving user session`,
        kind: "IResponseErrorInternal",
      }),
    );
  });
});
