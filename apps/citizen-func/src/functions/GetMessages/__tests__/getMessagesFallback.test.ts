import { Context } from "@azure/functions";
import { TagEnum as TagEnumBase } from "@pagopa/io-functions-commons/dist/generated/definitions/MessageCategoryBase";
import { TagEnum as TagEnumPayment } from "@pagopa/io-functions-commons/dist/generated/definitions/MessageCategoryPayment";
import { MessageContent } from "@pagopa/io-functions-commons/dist/generated/definitions/MessageContent";
import { MessageModel } from "@pagopa/io-functions-commons/dist/src/models/message";
import { retrievedMessageToPublic } from "@pagopa/io-functions-commons/dist/src/utils/messages";
import { Ulid } from "@pagopa/ts-commons/lib/strings";
import { BlobService } from "azure-storage";
import * as E from "fp-ts/lib/Either";
import * as O from "fp-ts/lib/Option";
import * as TE from "fp-ts/lib/TaskEither";
import { pipe } from "fp-ts/lib/function";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { aRetrievedMessageWithoutContent } from "../../../__mocks__/messages";
import { aRetrievedService } from "../../../__mocks__/mocks.service_preference";
import { redisClientMock } from "../../../__mocks__/redis";
import {
  mockRCConfigurationModel,
  mockRCConfigurationTtl,
} from "../../../__mocks__/remote-content";
import { HasPreconditionEnum } from "../../../generated/definitions/HasPrecondition";
import { aMessageContent } from "../../../utils/__tests__/messages.test";
import {
  CreatedMessageWithoutContentWithStatus,
  ThirdPartyDataWithCategoryFetcher,
} from "../../../utils/messages";
import { RedisClientFactory } from "../../../utils/redis";
import RCConfigurationUtility from "../../../utils/remoteContentConfig";
import { enrichContentData } from "../getMessagesFunctions/getMessages.fallback";
import { EnrichedMessageWithContent } from "../getMessagesFunctions/models";

vi.stubEnv("APPLICATIONINSIGHTS_CONNECTION_STRING", "foo");

const findLastVersionByModelIdMock = vi
  .fn()
  .mockImplementation(() => TE.of(O.some(aRetrievedService)));

const blobServiceMock = {
  getBlobToText: vi.fn(),
} as unknown as BlobService;

const messages = [E.right(aRetrievedMessageWithoutContent)];

const functionsContextMock = {
  log: {
    error: vi.fn(),
  },
} as unknown as Context;

const getMockIterator = (values: unknown) => ({
  next: vi
    .fn()
    .mockImplementationOnce(async () => ({
      value: values,
    }))
    .mockImplementationOnce(async () => ({ done: true })),
});

const messageIterator = getMockIterator(messages);

const getContentFromBlobMock = vi
  .fn()
  .mockImplementation(() => TE.of(O.some(aMessageContent)));

const getMessageModelMock = (messageIterator: unknown) =>
  ({
    findMessages: vi.fn(() => TE.of(messageIterator)),
    getContentFromBlob: getContentFromBlobMock,
  }) as unknown as MessageModel;

const messageModelMock = getMessageModelMock(messageIterator);

const dummyThirdPartyDataWithCategoryFetcher: ThirdPartyDataWithCategoryFetcher =
  vi.fn().mockImplementation(() => ({
    category: TagEnumBase.GENERIC,
  }));

const messageList: CreatedMessageWithoutContentWithStatus[] = [
  {
    ...retrievedMessageToPublic(aRetrievedMessageWithoutContent),
    is_archived: false,
    is_read: false,
  },
];

const mockedGreenPassContent = {
  eu_covid_cert: {
    auth_code: "an_auth_code",
  },
  markdown: "a markdown".repeat(80),
  subject: "a subject".repeat(10),
} as MessageContent;

const mockedPaymentContent = {
  markdown: "a markdown".repeat(80),
  payment_data: {
    amount: 1,
    notice_number: "012345678901234567",
  },
  subject: "a subject".repeat(10),
} as MessageContent;

const redisClientFactoryMock = {
  getInstance: async () => redisClientMock,
} as RedisClientFactory;

const mockRCConfigurationUtility = new RCConfigurationUtility(
  redisClientFactoryMock,
  mockRCConfigurationModel,
  mockRCConfigurationTtl,
  { aServiceId: "01HMRBX079WA5SGYBQP1A7FSKH" } as unknown as ReadonlyMap<
    string,
    Ulid
  >,
);

describe("enrichContentData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return right when message blob is retrieved", async () => {
    const enrichMessages = enrichContentData(
      functionsContextMock,
      messageModelMock,
      blobServiceMock,
      mockRCConfigurationUtility,
      dummyThirdPartyDataWithCategoryFetcher,
    );

    const enrichedMessages = await Promise.all(enrichMessages(messageList));

    enrichedMessages.map((enrichedMessage) => {
      expect(E.isRight(enrichedMessage)).toBe(true);
      if (E.isRight(enrichedMessage)) {
        expect(EnrichedMessageWithContent.is(enrichedMessage.right)).toBe(true);
        expect(enrichedMessage.right.category).toEqual({
          tag: TagEnumBase.GENERIC,
        });
        expect(enrichedMessage.right.has_remote_content).toBeFalsy();
        expect(enrichedMessage.right.has_precondition).toBeFalsy();
      }
    });
    expect(functionsContextMock.log.error).not.toHaveBeenCalled();
    expect(findLastVersionByModelIdMock).not.toHaveBeenCalled();
  });

  it("should return right with right message EU_COVID_CERT category when message content is retrieved", async () => {
    getContentFromBlobMock.mockImplementationOnce(() =>
      TE.of(O.some(mockedGreenPassContent)),
    );
    const enrichMessages = enrichContentData(
      functionsContextMock,
      messageModelMock,
      blobServiceMock,
      mockRCConfigurationUtility,
      dummyThirdPartyDataWithCategoryFetcher,
    );

    const enrichedMessages = await Promise.all(enrichMessages(messageList));

    enrichedMessages.map((enrichedMessage) => {
      expect(E.isRight(enrichedMessage)).toBe(true);
      if (E.isRight(enrichedMessage)) {
        expect(EnrichedMessageWithContent.is(enrichedMessage.right)).toBe(true);
        expect(enrichedMessage.right.category).toEqual({
          tag: TagEnumBase.EU_COVID_CERT,
        });
        expect(enrichedMessage.right.has_remote_content).toBeFalsy();
        expect(enrichedMessage.right.has_precondition).toBeFalsy();
      }
    });
    expect(functionsContextMock.log.error).not.toHaveBeenCalled();
  });

  it("should return right with right PAYMENT category when message content is retrieved", async () => {
    getContentFromBlobMock.mockImplementationOnce(() =>
      TE.of(O.some(mockedPaymentContent)),
    );
    const enrichMessages = enrichContentData(
      functionsContextMock,
      messageModelMock,
      blobServiceMock,
      mockRCConfigurationUtility,
      dummyThirdPartyDataWithCategoryFetcher,
    );

    const enrichedMessagesPromises = enrichMessages(messageList);

    const enrichedMessages = await pipe(
      TE.tryCatch(
        async () => Promise.all(enrichedMessagesPromises),
        () => {},
      ),
      TE.getOrElse(() => {
        throw Error();
      }),
    )();

    enrichedMessages.map((enrichedMessage) => {
      expect(E.isRight(enrichedMessage)).toBe(true);
      if (E.isRight(enrichedMessage)) {
        expect(EnrichedMessageWithContent.is(enrichedMessage.right)).toBe(true);
        expect(enrichedMessage.right.category).toEqual({
          noticeNumber: mockedPaymentContent.payment_data?.notice_number,
          tag: TagEnumPayment.PAYMENT,
        });
        expect(enrichedMessage.right.has_remote_content).toBeFalsy();
        expect(enrichedMessage.right.has_precondition).toBeFalsy();
      }
    });
    expect(functionsContextMock.log.error).not.toHaveBeenCalled();
  });

  it("should return right with correct third party data flags when message content is retrieved", async () => {
    getContentFromBlobMock.mockImplementationOnce(() =>
      TE.of(
        O.some({
          ...aMessageContent,
          third_party_data: {
            has_precondition: HasPreconditionEnum.ALWAYS,
            has_remote_content: true,
          },
        }),
      ),
    );
    const enrichMessages = enrichContentData(
      functionsContextMock,
      messageModelMock,
      blobServiceMock,
      mockRCConfigurationUtility,
      dummyThirdPartyDataWithCategoryFetcher,
    );

    const enrichedMessagesPromises = enrichMessages([
      {
        ...retrievedMessageToPublic(aRetrievedMessageWithoutContent),
        is_archived: false,
        is_read: false,
      },
    ]);

    const enrichedMessages = await pipe(
      TE.tryCatch(
        async () => Promise.all(enrichedMessagesPromises),
        () => {},
      ),
      TE.getOrElse(() => {
        throw Error();
      }),
    )();

    enrichedMessages.map((enrichedMessage) => {
      expect(E.isRight(enrichedMessage)).toBe(true);
      if (E.isRight(enrichedMessage)) {
        expect(EnrichedMessageWithContent.is(enrichedMessage.right)).toBe(true);
        expect(enrichedMessage.right.category).toEqual({
          tag: TagEnumBase.GENERIC,
        });
        expect(enrichedMessage.right.has_remote_content).toBeTruthy();
        expect(enrichedMessage.right.has_precondition).toBeTruthy();
      }
    });
    expect(functionsContextMock.log.error).not.toHaveBeenCalled();
  });

  it("should return left when message model return an error", async () => {
    findLastVersionByModelIdMock.mockImplementationOnce(() =>
      TE.right(O.some(aRetrievedService)),
    );

    getContentFromBlobMock.mockImplementationOnce(() =>
      TE.left(new Error("GENERIC_ERROR")),
    );

    const enrichMessages = enrichContentData(
      functionsContextMock,
      messageModelMock,
      blobServiceMock,
      mockRCConfigurationUtility,
      dummyThirdPartyDataWithCategoryFetcher,
    );

    const enrichedMessagesPromises = enrichMessages(messageList);

    const enrichedMessages = await pipe(
      TE.tryCatch(
        async () => Promise.all(enrichedMessagesPromises),
        () => {},
      ),
      TE.getOrElse(() => {
        throw Error();
      }),
    )();

    enrichedMessages.map((enrichedMessage) => {
      expect(E.isLeft(enrichedMessage)).toBe(true);
    });

    expect(functionsContextMock.log.error).toHaveBeenCalledTimes(1);
    expect(functionsContextMock.log.error).toHaveBeenCalledWith(
      `Cannot enrich message "${aRetrievedMessageWithoutContent.id}" | Error: GENERIC_ERROR`,
    );
  });
});
