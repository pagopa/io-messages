import { Container } from "@azure/cosmos";
import { createBlobService } from "@pagopa/azure-storage-legacy-migration-kit";
import { CreatedMessageWithoutContent } from "@pagopa/io-functions-commons/dist/generated/definitions/CreatedMessageWithoutContent";
import { EnrichedMessage } from "@pagopa/io-functions-commons/dist/generated/definitions/EnrichedMessage";
import { FeatureLevelTypeEnum } from "@pagopa/io-functions-commons/dist/generated/definitions/FeatureLevelType";
import { MessageBodyMarkdown } from "@pagopa/io-functions-commons/dist/generated/definitions/MessageBodyMarkdown";
import { TagEnum as TagEnumBase } from "@pagopa/io-functions-commons/dist/generated/definitions/MessageCategoryBase";
import { TagEnum as TagEnumPN } from "@pagopa/io-functions-commons/dist/generated/definitions/MessageCategoryPN";
import { MessageContent } from "@pagopa/io-functions-commons/dist/generated/definitions/MessageContent";
import { MessageSubject } from "@pagopa/io-functions-commons/dist/generated/definitions/MessageSubject";
import { PaymentAmount } from "@pagopa/io-functions-commons/dist/generated/definitions/PaymentAmount";
import { PaymentData } from "@pagopa/io-functions-commons/dist/generated/definitions/PaymentData";
import { PaymentNoticeNumber } from "@pagopa/io-functions-commons/dist/generated/definitions/PaymentNoticeNumber";
import { ServiceId } from "@pagopa/io-functions-commons/dist/generated/definitions/ServiceId";
import { TimeToLiveSeconds } from "@pagopa/io-functions-commons/dist/generated/definitions/TimeToLiveSeconds";
import {
  MessageModel,
  NewMessageWithoutContent,
  RetrievedMessageWithoutContent,
} from "@pagopa/io-functions-commons/dist/src/models/message";
import { MessageStatusModel } from "@pagopa/io-functions-commons/dist/src/models/message_status";
import {
  Service,
  ServiceModel,
} from "@pagopa/io-functions-commons/dist/src/models/service";
import { toCosmosErrorResponse } from "@pagopa/io-functions-commons/dist/src/utils/cosmosdb_model";
import { NonNegativeInteger } from "@pagopa/ts-commons/lib/numbers";
import {
  FiscalCode,
  NonEmptyString,
  OrganizationFiscalCode,
} from "@pagopa/ts-commons/lib/strings";
import * as O from "fp-ts/lib/Option";
import * as TE from "fp-ts/lib/TaskEither";
import { afterEach, describe, expect, it, vi } from "vitest";

import { context as contextMock } from "../../../__mocks__/context";
import { envConfig } from "../../../__mocks__/env-config.mock";
import {
  aCosmosResourceMetadata,
  aPnThirdPartyData,
} from "../../../__mocks__/mocks";
import { aMessageStatus } from "../../../__mocks__/mocks.message-status";
import {
  aRetrievedService,
  aServiceId,
} from "../../../__mocks__/mocks.service_preference";
import * as mc from "../../../utils/message-content";
import * as msgUtil from "../../../utils/messages";
import { RedisClientFactory } from "../../../utils/redis";
import { GetMessageHandler } from "../handler";

const aFiscalCode = "FRLFRC74E04B157I" as FiscalCode;
const aDate = new Date();

const aNewMessageWithoutContent: NewMessageWithoutContent = {
  createdAt: aDate,
  featureLevelType: FeatureLevelTypeEnum.STANDARD,
  fiscalCode: aFiscalCode,
  id: "A_MESSAGE_ID" as NonEmptyString,
  indexedId: "A_MESSAGE_ID" as NonEmptyString,
  isPending: true,
  kind: "INewMessageWithoutContent",
  senderServiceId: aServiceId,
  senderUserId: "u123" as NonEmptyString,
  timeToLiveSeconds: 3600 as TimeToLiveSeconds,
};

const aRetrievedMessageWithoutContent: RetrievedMessageWithoutContent = {
  ...aNewMessageWithoutContent,
  ...aCosmosResourceMetadata,
  kind: "IRetrievedMessageWithoutContent",
};

const aPublicExtendedMessage: CreatedMessageWithoutContent = {
  created_at: aDate,
  fiscal_code: aNewMessageWithoutContent.fiscalCode,
  id: "A_MESSAGE_ID",
  sender_service_id: aNewMessageWithoutContent.senderServiceId,
  time_to_live: 3600 as TimeToLiveSeconds,
};

const aMessageContent: MessageContent = {
  markdown: "a".repeat(81) as MessageBodyMarkdown,
  subject: "sub".repeat(10) as MessageSubject,
};

const aPublicExtendedMessageResponse = {
  message: { ...aPublicExtendedMessage, content: aMessageContent },
};

const aSenderService: Service = {
  ...aRetrievedService,
  organizationFiscalCode: "12345678901" as OrganizationFiscalCode,
};
const aPaymentDataWithoutPayee: PaymentData = {
  amount: 1000 as PaymentAmount,
  notice_number: "177777777777777777" as PaymentNoticeNumber,
};

const anEnrichedMessageResponse: EnrichedMessage = {
  ...aPublicExtendedMessage,
  is_archived: aMessageStatus.isArchived,
  is_read: aMessageStatus.isRead,
  message_title: aMessageContent.subject,
  organization_fiscal_code: aSenderService.organizationFiscalCode,
  organization_name: aSenderService.organizationName,
  service_name: aSenderService.serviceName,
};

const mockServiceModel = new ServiceModel({} as Container);
const mockBlobServiceModel = createBlobService(
  "UseDevelopmentStorage=true",
  "UseDevelopmentStorage=true",
);

const findMessageForRecipientMock = vi
  .fn()
  .mockImplementation(() => TE.of(O.some(aRetrievedMessageWithoutContent)));

const getContentFromBlobMock = vi
  .fn()
  .mockImplementation(() => TE.of(O.some(aMessageContent)));

class MockMessageModel extends MessageModel {
  findMessageForRecipient = findMessageForRecipientMock;
  getContentFromBlob = getContentFromBlobMock;
  constructor() {
    super({} as Container, "mock-container" as NonEmptyString);
  }
}

const mockMessageModel = new MockMessageModel();

const findLastVersionByModelIdMessageStatusMock = vi
  .fn()
  .mockImplementation(() => TE.of(O.some(aMessageStatus)));

class MockMessageStatusModel extends MessageStatusModel {
  findLastVersionByModelId = findLastVersionByModelIdMessageStatusMock;
  constructor() {
    super({} as Container);
  }
}
const mockMessageStatusModel = new MockMessageStatusModel();

export class MockRedisClientFactory extends RedisClientFactory {
  public readonly getInstance = vi.fn().mockResolvedValue({});
}

const mockRedisFactoryMock = new MockRedisClientFactory(envConfig);
const redisClientMock = mockRedisFactoryMock.getInstance();

const aServiceCacheTTL = 3600 as NonNegativeInteger;

const getOrCacheServiceMock = vi
  .fn()
  .mockImplementation(() => TE.of(aSenderService));

vi.spyOn(msgUtil, "getOrCacheService").mockImplementation(
  getOrCacheServiceMock,
);

const dummyThirdPartyDataWithCategoryFetcher: msgUtil.ThirdPartyDataWithCategoryFetcher =
  vi.fn().mockImplementation(() => ({
    category: TagEnumBase.GENERIC,
  }));

/* eslint-disable max-lines-per-function*/
describe("GetMessageHandler", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });
  it("should fail if any error occurs trying to retrieve the message content", async () => {
    vi.spyOn(mc, "getContentFromBlob").mockReturnValueOnce(
      TE.left(new Error()),
    );

    const getMessageHandler = GetMessageHandler(
      mockMessageModel,
      mockMessageStatusModel,
      mockBlobServiceModel,
      mockServiceModel,
      redisClientMock,
      aServiceCacheTTL,
      envConfig.SERVICE_TO_RC_CONFIGURATION_MAP,
      dummyThirdPartyDataWithCategoryFetcher,
    );

    const result = await getMessageHandler(
      contextMock,
      aFiscalCode,
      aRetrievedMessageWithoutContent.id,
      O.none,
    );

    expect(mc.getContentFromBlob).toHaveBeenCalledTimes(1);
    expect(mockMessageModel.findMessageForRecipient).toHaveBeenCalledTimes(1);
    expect(mockMessageModel.findMessageForRecipient).toHaveBeenCalledWith(
      aRetrievedMessageWithoutContent.fiscalCode,
      aRetrievedMessageWithoutContent.id,
    );

    expect(result.kind).toBe("IResponseErrorInternal");
  });

  it("should fail if any error occurs trying to retrieve message status while requesting an enriched message", async () => {
    vi.spyOn(mc, "getContentFromBlob").mockReturnValueOnce(
      TE.of(O.some(aMessageContent)),
    );

    findLastVersionByModelIdMessageStatusMock.mockImplementationOnce(() =>
      TE.left(
        toCosmosErrorResponse(new Error("Cannot retrieve message status")),
      ),
    );

    const getMessageHandler = GetMessageHandler(
      mockMessageModel,
      mockMessageStatusModel,
      mockBlobServiceModel,
      mockServiceModel,
      redisClientMock,
      aServiceCacheTTL,
      envConfig.SERVICE_TO_RC_CONFIGURATION_MAP,
      dummyThirdPartyDataWithCategoryFetcher,
    );

    const result = await getMessageHandler(
      contextMock,
      aFiscalCode,
      aRetrievedMessageWithoutContent.id,
      O.some(true),
    );

    expect(mc.getContentFromBlob).toHaveBeenCalledTimes(1);
    expect(mockMessageModel.findMessageForRecipient).toHaveBeenCalledTimes(1);
    expect(mockMessageModel.findMessageForRecipient).toHaveBeenCalledWith(
      aRetrievedMessageWithoutContent.fiscalCode,
      aRetrievedMessageWithoutContent.id,
    );

    expect(result.kind).toBe("IResponseErrorInternal");
  });

  it("should respond with an internal error if message sender cannot be retrieved for enriched message", async () => {
    getOrCacheServiceMock.mockImplementationOnce(() =>
      TE.left(new Error("Cannot query services")),
    );

    vi.spyOn(mc, "getContentFromBlob").mockReturnValueOnce(
      TE.of(O.some(aMessageContent)),
    );

    const getMessageHandler = GetMessageHandler(
      mockMessageModel,
      mockMessageStatusModel,
      mockBlobServiceModel,
      mockServiceModel,
      redisClientMock,
      aServiceCacheTTL,
      envConfig.SERVICE_TO_RC_CONFIGURATION_MAP,
      dummyThirdPartyDataWithCategoryFetcher,
    );

    const result = await getMessageHandler(
      contextMock,
      aFiscalCode,
      aRetrievedMessageWithoutContent.id,
      O.some(true),
    );

    expect(mockMessageModel.findMessageForRecipient).toHaveBeenCalledTimes(1);
    expect(mc.getContentFromBlob).toHaveBeenCalledTimes(1);
    expect(getOrCacheServiceMock).toHaveBeenCalledTimes(1);

    expect(result.kind).toBe("IResponseErrorInternal");
  });

  it("should respond with an enriched message", async () => {
    vi.spyOn(mc, "getContentFromBlob").mockReturnValueOnce(
      TE.of(
        O.some({
          ...aMessageContent,
          payment_data: aPaymentDataWithoutPayee,
        }),
      ),
    );

    const getMessageHandler = GetMessageHandler(
      mockMessageModel,
      mockMessageStatusModel,
      mockBlobServiceModel,
      mockServiceModel,
      redisClientMock,
      aServiceCacheTTL,
      envConfig.SERVICE_TO_RC_CONFIGURATION_MAP,
      dummyThirdPartyDataWithCategoryFetcher,
    );

    const result = await getMessageHandler(
      contextMock,
      aFiscalCode,
      aRetrievedMessageWithoutContent.id,
      O.some(true),
    );

    expect(mc.getContentFromBlob).toHaveBeenCalledTimes(1);
    expect(mockMessageModel.findMessageForRecipient).toHaveBeenCalledTimes(1);
    expect(mockMessageModel.findMessageForRecipient).toHaveBeenCalledWith(
      aRetrievedMessageWithoutContent.fiscalCode,
      aRetrievedMessageWithoutContent.id,
    );

    expect(result.kind).toBe("IResponseSuccessJson");
    if (result.kind === "IResponseSuccessJson") {
      expect(result.value).toEqual({
        ...aPublicExtendedMessageResponse,
        message: {
          ...aPublicExtendedMessageResponse.message,
          category: {
            rptId: `${aSenderService.organizationFiscalCode}${aPaymentDataWithoutPayee.notice_number}`,
            tag: "PAYMENT",
          },
          content: {
            ...aMessageContent,
            payment_data: {
              ...aPaymentDataWithoutPayee,
              payee: {
                fiscal_code: aSenderService.organizationFiscalCode,
              },
            },
          },
          ...anEnrichedMessageResponse,
        },
      });
    }
  });

  it("should respond with an enriched message when a PN third-party-data is provided", async () => {
    const thirdPartyFetcherForAServiceId = (serviceId: ServiceId) => ({
      category: serviceId === aServiceId ? TagEnumPN.PN : TagEnumBase.GENERIC,
    });

    vi.spyOn(mc, "getContentFromBlob").mockReturnValueOnce(
      TE.of(
        O.some({
          ...aMessageContent,
          third_party_data: aPnThirdPartyData,
        }),
      ),
    );

    const getMessageHandler = GetMessageHandler(
      mockMessageModel,
      mockMessageStatusModel,
      mockBlobServiceModel,
      mockServiceModel,
      redisClientMock,
      aServiceCacheTTL,
      envConfig.SERVICE_TO_RC_CONFIGURATION_MAP,
      thirdPartyFetcherForAServiceId,
    );

    const result = await getMessageHandler(
      contextMock,
      aFiscalCode,
      aRetrievedMessageWithoutContent.id,
      O.some(true),
    );

    expect(mc.getContentFromBlob).toHaveBeenCalledTimes(1);
    expect(mockMessageModel.findMessageForRecipient).toHaveBeenCalledTimes(1);
    expect(mockMessageModel.findMessageForRecipient).toHaveBeenCalledWith(
      aRetrievedMessageWithoutContent.fiscalCode,
      aRetrievedMessageWithoutContent.id,
    );

    expect(result.kind).toBe("IResponseSuccessJson");
    if (result.kind === "IResponseSuccessJson") {
      expect(result.value).toEqual({
        ...aPublicExtendedMessageResponse,
        message: {
          ...aPublicExtendedMessageResponse.message,
          category: {
            tag: TagEnumPN.PN,
            ...aPnThirdPartyData,
          },
          content: {
            ...aMessageContent,
            third_party_data: {
              ...aPnThirdPartyData,
              configuration_id: "01ARZ3NDEKTSV4RRFFQ69G5FAV",
            },
          },
          ...anEnrichedMessageResponse,
        },
      });
    }
  });

  it("should respond with a message", async () => {
    vi.spyOn(mc, "getContentFromBlob").mockReturnValueOnce(
      TE.of(O.some(aMessageContent)),
    );

    const getMessageHandler = GetMessageHandler(
      mockMessageModel,
      mockMessageStatusModel,
      mockBlobServiceModel,
      mockServiceModel,
      redisClientMock,
      aServiceCacheTTL,
      envConfig.SERVICE_TO_RC_CONFIGURATION_MAP,
      dummyThirdPartyDataWithCategoryFetcher,
    );

    const result = await getMessageHandler(
      contextMock,
      aFiscalCode,
      aRetrievedMessageWithoutContent.id,
      O.none,
    );

    expect(mc.getContentFromBlob).toHaveBeenCalledTimes(1);
    expect(mockMessageModel.findMessageForRecipient).toHaveBeenCalledTimes(1);
    expect(mockMessageModel.findMessageForRecipient).toHaveBeenCalledWith(
      aRetrievedMessageWithoutContent.fiscalCode,
      aRetrievedMessageWithoutContent.id,
    );

    expect(result.kind).toBe("IResponseSuccessJson");
    if (result.kind === "IResponseSuccessJson") {
      expect(result.value).toEqual(aPublicExtendedMessageResponse);
    }
  });

  it("should respond with a message with eu_covid_cert", async () => {
    const aRetrievedMessageWithEuCovidCert = {
      ...aRetrievedMessageWithoutContent,
      content: {
        eu_covid_cert: {
          auth_code: "ACode",
        },
        markdown: "m".repeat(80),
        subject: "e".repeat(80),
      },
      kind: "IRetrievedMessageWithContent",
    };

    const expected = {
      ...aPublicExtendedMessage,
      content: aRetrievedMessageWithEuCovidCert.content,
    };

    findMessageForRecipientMock.mockImplementationOnce(() =>
      TE.of(O.some(aRetrievedMessageWithEuCovidCert)),
    );
    vi.spyOn(mc, "getContentFromBlob").mockImplementationOnce(() =>
      TE.of(O.some(aRetrievedMessageWithEuCovidCert.content as MessageContent)),
    );

    const getMessageHandler = GetMessageHandler(
      mockMessageModel,
      mockMessageStatusModel,
      mockBlobServiceModel,
      mockServiceModel,
      redisClientMock,
      aServiceCacheTTL,
      envConfig.SERVICE_TO_RC_CONFIGURATION_MAP,
      dummyThirdPartyDataWithCategoryFetcher,
    );

    const result = await getMessageHandler(
      contextMock,
      aFiscalCode,
      aRetrievedMessageWithEuCovidCert.id,
      O.none,
    );

    expect(mc.getContentFromBlob).toHaveBeenCalledTimes(1);
    expect(mockMessageModel.findMessageForRecipient).toHaveBeenCalledTimes(1);
    expect(mockMessageModel.findMessageForRecipient).toHaveBeenCalledWith(
      aRetrievedMessageWithEuCovidCert.fiscalCode,
      aRetrievedMessageWithEuCovidCert.id,
    );

    expect(result.kind).toBe("IResponseSuccessJson");
    if (result.kind === "IResponseSuccessJson") {
      expect(result.value.message).toEqual(
        expect.objectContaining({
          ...expected,
        }),
      );
    }
  });

  it("should respond with not found if a message does not exist", async () => {
    findMessageForRecipientMock.mockImplementationOnce(() => TE.of(O.none));

    const getMessageHandler = GetMessageHandler(
      mockMessageModel,
      mockMessageStatusModel,
      mockBlobServiceModel,
      mockServiceModel,
      redisClientMock,
      aServiceCacheTTL,
      envConfig.SERVICE_TO_RC_CONFIGURATION_MAP,
      dummyThirdPartyDataWithCategoryFetcher,
    );

    const result = await getMessageHandler(
      contextMock,
      aFiscalCode,
      aRetrievedMessageWithoutContent.id,
      O.none,
    );

    expect(mockMessageModel.findMessageForRecipient).toHaveBeenCalledTimes(1);

    expect(result.kind).toBe("IResponseErrorNotFound");
  });

  it("should respond with a message payment data overriden with payee if original content does not have a payee", async () => {
    vi.spyOn(mc, "getContentFromBlob").mockImplementationOnce(() =>
      TE.of(
        O.some({
          ...aMessageContent,
          payment_data: aPaymentDataWithoutPayee,
        }),
      ),
    );

    const getMessageHandler = GetMessageHandler(
      mockMessageModel,
      mockMessageStatusModel,
      mockBlobServiceModel,
      mockServiceModel,
      redisClientMock,
      aServiceCacheTTL,
      envConfig.SERVICE_TO_RC_CONFIGURATION_MAP,
      dummyThirdPartyDataWithCategoryFetcher,
    );

    const result = await getMessageHandler(
      contextMock,
      aFiscalCode,
      aRetrievedMessageWithoutContent.id,
      O.none,
    );

    expect(mockMessageModel.findMessageForRecipient).toHaveBeenCalledTimes(1);
    expect(mc.getContentFromBlob).toHaveBeenCalledTimes(1);
    expect(getOrCacheServiceMock).toHaveBeenCalledTimes(1);

    const expected = {
      ...aPublicExtendedMessage,
      content: {
        ...aMessageContent,
        payment_data: {
          ...aPaymentDataWithoutPayee,
          payee: {
            fiscal_code: aSenderService.organizationFiscalCode,
          },
        },
      },
    };

    expect(result.kind).toBe("IResponseSuccessJson");
    if (result.kind === "IResponseSuccessJson") {
      expect(result.value.message).toEqual(expected);
    }
  });

  it("should respond with an internal error if message sender cannot be retrieved", async () => {
    vi.spyOn(mc, "getContentFromBlob").mockImplementationOnce(() =>
      TE.of(
        O.some({
          ...aMessageContent,
          payment_data: aPaymentDataWithoutPayee,
        }),
      ),
    );

    getOrCacheServiceMock.mockImplementationOnce(() =>
      TE.left(new Error("Cannot query services")),
    );

    const getMessageHandler = GetMessageHandler(
      mockMessageModel,
      mockMessageStatusModel,
      mockBlobServiceModel,
      mockServiceModel,
      redisClientMock,
      aServiceCacheTTL,
      envConfig.SERVICE_TO_RC_CONFIGURATION_MAP,
      dummyThirdPartyDataWithCategoryFetcher,
    );

    const result = await getMessageHandler(
      contextMock,
      aFiscalCode,
      aRetrievedMessageWithoutContent.id,
      O.none,
    );

    expect(mockMessageModel.findMessageForRecipient).toHaveBeenCalledTimes(1);
    expect(mc.getContentFromBlob).toHaveBeenCalledTimes(1);
    expect(getOrCacheServiceMock).toHaveBeenCalledTimes(1);

    expect(result.kind).toBe("IResponseErrorInternal");
  });

  it("should respond with an internal error if message sender cannot be found", async () => {
    vi.spyOn(mc, "getContentFromBlob").mockImplementationOnce(() =>
      TE.of(
        O.some({
          ...aMessageContent,
          payment_data: aPaymentDataWithoutPayee,
        }),
      ),
    );
    getOrCacheServiceMock.mockImplementationOnce(() =>
      TE.left(new Error("Cannot find service")),
    );

    const getMessageHandler = GetMessageHandler(
      mockMessageModel,
      mockMessageStatusModel,
      mockBlobServiceModel,
      mockServiceModel,
      redisClientMock,
      aServiceCacheTTL,
      envConfig.SERVICE_TO_RC_CONFIGURATION_MAP,
      dummyThirdPartyDataWithCategoryFetcher,
    );

    const result = await getMessageHandler(
      contextMock,
      aFiscalCode,
      aRetrievedMessageWithoutContent.id,
      O.none,
    );

    expect(mockMessageModel.findMessageForRecipient).toHaveBeenCalledTimes(1);
    expect(mc.getContentFromBlob).toHaveBeenCalledTimes(1);
    expect(getOrCacheServiceMock).toHaveBeenCalledTimes(1);

    expect(result.kind).toBe("IResponseErrorInternal");
  });
});
