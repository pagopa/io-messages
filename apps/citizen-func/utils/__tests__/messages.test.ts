import { Context } from "@azure/functions";
import { CreatedMessageWithoutContent } from "@pagopa/io-functions-commons/dist/generated/definitions/CreatedMessageWithoutContent";
import { EnrichedMessage } from "@pagopa/io-functions-commons/dist/generated/definitions/EnrichedMessage";
import { FeatureLevelTypeEnum } from "@pagopa/io-functions-commons/dist/generated/definitions/FeatureLevelType";
import { HasPreconditionEnum } from "@pagopa/io-functions-commons/dist/generated/definitions/HasPrecondition";
import { MaxAllowedPaymentAmount } from "@pagopa/io-functions-commons/dist/generated/definitions/MaxAllowedPaymentAmount";
import { TagEnum as TagEnumBase } from "@pagopa/io-functions-commons/dist/generated/definitions/MessageCategoryBase";
import { TagEnum as TagEnumPn } from "@pagopa/io-functions-commons/dist/generated/definitions/MessageCategoryPN";
import { TagEnum as TagEnumPayment } from "@pagopa/io-functions-commons/dist/generated/definitions/MessageCategoryPayment";
import { MessageContent } from "@pagopa/io-functions-commons/dist/generated/definitions/MessageContent";
import { TimeToLiveSeconds } from "@pagopa/io-functions-commons/dist/generated/definitions/TimeToLiveSeconds";
import {
  NewMessageWithoutContent,
  RetrievedMessageWithoutContent,
} from "@pagopa/io-functions-commons/dist/src/models/message";
import {
  NewService,
  RetrievedService,
  Service,
  ServiceModel,
  toAuthorizedCIDRs,
  toAuthorizedRecipients,
} from "@pagopa/io-functions-commons/dist/src/models/service";
import { toCosmosErrorResponse } from "@pagopa/io-functions-commons/dist/src/utils/cosmosdb_model";
import { retrievedMessageToPublic } from "@pagopa/io-functions-commons/dist/src/utils/messages";
import { NonNegativeInteger } from "@pagopa/ts-commons/lib/numbers";
import {
  FiscalCode,
  NonEmptyString,
  OrganizationFiscalCode,
} from "@pagopa/ts-commons/lib/strings";
import { TelemetryClient } from "applicationinsights";
import * as E from "fp-ts/lib/Either";
import * as O from "fp-ts/lib/Option";
import * as TE from "fp-ts/lib/TaskEither";
import { beforeEach, describe, expect, it, test, vi } from "vitest";

import { aCosmosResourceMetadata } from "../../__mocks__/mocks";
import { EnrichedMessageWithContent } from "../../GetMessages/getMessagesFunctions/models";
import { IConfig } from "../config";
import {
  CreatedMessageWithoutContentWithStatus,
  ThirdPartyDataWithCategoryFetcher,
  computeFlagFromHasPrecondition,
  enrichServiceData,
  getThirdPartyDataWithCategoryFetcher,
  mapMessageCategory,
} from "../messages";
import { RedisClientFactory } from "../redis";
import * as redis from "../redis_storage";

vi.stubEnv("APPLICATIONINSIGHTS_CONNECTION_STRING", "foo");

const dummyThirdPartyDataWithCategoryFetcher: ThirdPartyDataWithCategoryFetcher =
  vi.fn().mockImplementation(() => ({
    category: TagEnumBase.GENERIC,
  }));

const anOrganizationFiscalCode = "01234567890" as OrganizationFiscalCode;

const aService: Service = {
  authorizedCIDRs: toAuthorizedCIDRs([]),
  authorizedRecipients: toAuthorizedRecipients([]),
  departmentName: "MyDeptName" as NonEmptyString,
  isVisible: true,
  maxAllowedPaymentAmount: 0 as MaxAllowedPaymentAmount,
  organizationFiscalCode: anOrganizationFiscalCode,
  organizationName: "MyOrgName" as NonEmptyString,
  requireSecureChannels: false,
  serviceId: "MySubscriptionId" as NonEmptyString,
  serviceName: "MyServiceName" as NonEmptyString,
};

const aNewService: NewService = {
  ...aService,
  kind: "INewService",
};

const aRetrievedService: RetrievedService = {
  ...aNewService,
  ...aCosmosResourceMetadata,
  id: "123" as NonEmptyString,
  kind: "IRetrievedService",
  version: 1 as NonNegativeInteger,
};

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
  senderServiceId: aRetrievedService.serviceId,
  senderUserId: "u123" as NonEmptyString,
  timeToLiveSeconds: 3600 as TimeToLiveSeconds,
};

const aRetrievedMessageWithoutContent: RetrievedMessageWithoutContent = {
  ...aNewMessageWithoutContent,
  ...aCosmosResourceMetadata,
  kind: "IRetrievedMessageWithoutContent",
};

const mockedGenericContent = {
  markdown: "a markdown",
  subject: "a subject",
} as MessageContent;

const mockedPaymentContent = {
  markdown: "a markdown".repeat(80),
  payment_data: {
    amount: 1,
    notice_number: "012345678901234567",
  },
  subject: "a subject".repeat(10),
} as MessageContent;

const findLastVersionByModelIdMock = vi
  .fn()
  .mockImplementation(() => TE.of(O.some(aRetrievedService)));
const serviceModelMock = {
  findLastVersionByModelId: findLastVersionByModelIdMock,
} as unknown as ServiceModel;

const functionsContextMock = {
  log: {
    error: vi.fn(),
  },
} as unknown as Context;

const messages: CreatedMessageWithoutContentWithStatus[] = [
  {
    ...retrievedMessageToPublic(aRetrievedMessageWithoutContent),
    is_archived: false,
    is_read: false,
  },
];

const messagesWithGenericContent: readonly EnrichedMessageWithContent[] =
  messages.map((m) => ({
    ...m,
    category: mapMessageCategory(
      m,
      mockedGenericContent,
      dummyThirdPartyDataWithCategoryFetcher,
    ),
    id: m.id as NonEmptyString,
    message_title: mockedGenericContent.subject,
  }));

const messagesWithPaymentContent: EnrichedMessageWithContent[] = messages.map(
  (m) => ({
    ...m,
    category: mapMessageCategory(
      m,
      mockedPaymentContent,
      dummyThirdPartyDataWithCategoryFetcher,
    ),
    id: m.id as NonEmptyString,
    message_title: mockedPaymentContent.subject,
  }),
);

const setWithExpirationTaskMock = vi.fn().mockImplementation(() => TE.of(true));
vi.spyOn(redis, "setWithExpirationTask").mockImplementation(
  setWithExpirationTaskMock,
);

const getTaskMock = vi
  .fn()
  .mockImplementation(() => TE.of(O.some(JSON.stringify(aRetrievedService))));
vi.spyOn(redis, "getTask").mockImplementation(getTaskMock);

const aRedisClient = {} as unknown as RedisClientFactory;
const aServiceCacheTtl = 10 as NonNegativeInteger;

// ------------------------
// Tests
// ------------------------

describe("enrichServiceData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return right when service is retrieved from Redis cache", async () => {
    const enrichMessages = enrichServiceData(
      functionsContextMock,
      serviceModelMock,
      aRedisClient,
      aServiceCacheTtl,
    );
    const enrichedMessages = await enrichMessages(messagesWithGenericContent)();

    expect(E.isRight(enrichedMessages)).toBe(true);
    if (E.isRight(enrichedMessages)) {
      enrichedMessages.right.map((enrichedMessage) => {
        expect(EnrichedMessageWithContent.is(enrichedMessage)).toBe(true);
        expect(enrichedMessage.category).toEqual({
          tag: TagEnumBase.GENERIC,
        });
      });
    }
    expect(getTaskMock).toHaveBeenCalledTimes(1);
    expect(findLastVersionByModelIdMock).not.toHaveBeenCalled();
    expect(setWithExpirationTaskMock).not.toHaveBeenCalled();
    expect(functionsContextMock.log.error).not.toHaveBeenCalled();
  });

  it("should return right when  service is retrieved from Cosmos due to cache miss", async () => {
    getTaskMock.mockImplementationOnce(() => TE.of(O.none));
    const enrichMessages = enrichServiceData(
      functionsContextMock,
      serviceModelMock,
      aRedisClient,
      aServiceCacheTtl,
    );
    const enrichedMessages = await enrichMessages(messagesWithGenericContent)();

    expect(E.isRight(enrichedMessages)).toBe(true);
    if (E.isRight(enrichedMessages)) {
      enrichedMessages.right.map((enrichedMessage) => {
        expect(EnrichedMessageWithContent.is(enrichedMessage)).toBe(true);
        expect(enrichedMessage.category).toEqual({
          tag: TagEnumBase.GENERIC,
        });
      });
    }
    expect(getTaskMock).toHaveBeenCalledTimes(1);
    expect(findLastVersionByModelIdMock).toHaveBeenCalledTimes(1);
    expect(setWithExpirationTaskMock).toHaveBeenCalledTimes(1);
    expect(setWithExpirationTaskMock).toHaveBeenCalledWith(
      aRedisClient,
      aNewMessageWithoutContent.senderServiceId,
      JSON.stringify(aRetrievedService),
      aServiceCacheTtl,
    );
    expect(functionsContextMock.log.error).not.toHaveBeenCalled();
  });

  it("should return right when service is retrieved from Cosmos due to cache unavailability", async () => {
    getTaskMock.mockImplementationOnce(() =>
      TE.left(new Error("Redis unreachable")),
    );
    setWithExpirationTaskMock.mockImplementationOnce(() =>
      TE.left(new Error("Redis unreachable")),
    );
    const enrichMessages = enrichServiceData(
      functionsContextMock,
      serviceModelMock,
      aRedisClient,
      aServiceCacheTtl,
    );
    const enrichedMessages = await enrichMessages(messagesWithGenericContent)();

    expect(E.isRight(enrichedMessages)).toBe(true);
    if (E.isRight(enrichedMessages)) {
      enrichedMessages.right.map((enrichedMessage) => {
        expect(EnrichedMessageWithContent.is(enrichedMessage)).toBe(true);
        expect(enrichedMessage.category).toEqual({
          tag: TagEnumBase.GENERIC,
        });
      });
    }

    expect(getTaskMock).toHaveBeenCalledTimes(1);
    expect(findLastVersionByModelIdMock).toHaveBeenCalledTimes(1);
    expect(setWithExpirationTaskMock).toHaveBeenCalledTimes(1);
    expect(setWithExpirationTaskMock).toHaveBeenCalledWith(
      aRedisClient,
      aNewMessageWithoutContent.senderServiceId,
      JSON.stringify(aRetrievedService),
      aServiceCacheTtl,
    );
    expect(functionsContextMock.log.error).not.toHaveBeenCalled();
  });

  it("should return enrich rptId with organizationFiscalCode, when handling a PAYMENT message", async () => {
    const enrichMessages = enrichServiceData(
      functionsContextMock,
      serviceModelMock,
      aRedisClient,
      aServiceCacheTtl,
    );
    const enrichedMessages = await enrichMessages(messagesWithPaymentContent)();

    expect(E.isRight(enrichedMessages)).toBe(true);
    if (E.isRight(enrichedMessages)) {
      enrichedMessages.right.map((enrichedMessage) => {
        expect(EnrichedMessage.is(enrichedMessage)).toBe(true);
        expect(enrichedMessage.category).toEqual({
          rptId: `${aRetrievedService.organizationFiscalCode}${mockedPaymentContent.payment_data?.notice_number}`,
          tag: TagEnumPayment.PAYMENT,
        });
      });
    }
    expect(getTaskMock).toHaveBeenCalledTimes(1);
    expect(findLastVersionByModelIdMock).not.toHaveBeenCalled();
    expect(setWithExpirationTaskMock).not.toHaveBeenCalled();
    expect(functionsContextMock.log.error).not.toHaveBeenCalled();
  });

  it("should make one call per each serviceId", async () => {
    const enrichMessages = enrichServiceData(
      functionsContextMock,
      serviceModelMock,
      aRedisClient,
      aServiceCacheTtl,
    );
    const enrichedMessages = await enrichMessages(
      messagesWithGenericContent.flatMap((m) => [
        m,
        { ...m, sender_service_id: m.sender_service_id },
      ]),
    )();

    expect(E.isRight(enrichedMessages)).toBe(true);
    if (E.isRight(enrichedMessages)) {
      enrichedMessages.right.map((enrichedMessage) => {
        expect(EnrichedMessageWithContent.is(enrichedMessage)).toBe(true);
        expect(enrichedMessage.category).toEqual({
          tag: TagEnumBase.GENERIC,
        });
      });
    }
    expect(getTaskMock).toHaveBeenCalledTimes(1);
    expect(findLastVersionByModelIdMock).not.toHaveBeenCalled();
    expect(setWithExpirationTaskMock).not.toHaveBeenCalled();
    expect(functionsContextMock.log.error).not.toHaveBeenCalled();
  });

  it("should return left when service model return a cosmos error", async () => {
    getTaskMock.mockImplementationOnce(() => TE.left("Cache unreachable"));
    findLastVersionByModelIdMock.mockImplementationOnce(() =>
      TE.left(toCosmosErrorResponse("Any error message")),
    );

    const enrichMessages = enrichServiceData(
      functionsContextMock,
      serviceModelMock,
      aRedisClient,
      aServiceCacheTtl,
    );
    const enrichedMessages = await enrichMessages(messagesWithGenericContent)();

    expect(E.isLeft(enrichedMessages)).toBe(true);

    expect(functionsContextMock.log.error).toHaveBeenCalledTimes(1);
    expect(functionsContextMock.log.error).toHaveBeenCalledWith(
      `Cannot enrich service data | Error: COSMOS_ERROR_RESPONSE, ServiceId=${aRetrievedMessageWithoutContent.senderServiceId}`,
    );
  });

  it("should return left when service model return an empty result", async () => {
    getTaskMock.mockImplementationOnce(() => TE.left("Cache unreachable"));
    findLastVersionByModelIdMock.mockImplementationOnce(() => TE.right(O.none));

    const enrichMessages = enrichServiceData(
      functionsContextMock,
      serviceModelMock,
      aRedisClient,
      aServiceCacheTtl,
    );
    const enrichedMessages = await enrichMessages(messagesWithGenericContent)();

    expect(E.isLeft(enrichedMessages)).toBe(true);

    expect(functionsContextMock.log.error).toHaveBeenCalledTimes(1);
    expect(functionsContextMock.log.error).toHaveBeenCalledWith(
      `Cannot enrich service data | Error: EMPTY_SERVICE, ServiceId=${aRetrievedMessageWithoutContent.senderServiceId}`,
    );
  });
});

const mockTelemetryClient = {
  trackEvent: vi.fn(),
  trackException: vi.fn(),
} as unknown as TelemetryClient;
const aPnServiceId = "a-pn-service-id" as NonEmptyString;
const dummyConfig = { PN_SERVICE_ID: aPnServiceId } as IConfig;

describe("getThirdPartyDataWithCategoryFetcher", () => {
  it("GIVEN a pn service id WHEN get category fetcher is called THEN return PN category", () => {
    const result = getThirdPartyDataWithCategoryFetcher(
      dummyConfig,
      mockTelemetryClient,
    )(aPnServiceId);
    expect(result.category).toEqual(TagEnumPn.PN);
  });

  it("GIVEN a generic service id WHEN get category fetcher is called THEN return GENERIC category", () => {
    const result = getThirdPartyDataWithCategoryFetcher(
      dummyConfig,
      mockTelemetryClient,
    )(aService.serviceId);
    expect(result.category).toEqual(TagEnumBase.GENERIC);
  });
});

export const aMessageBodyMarkdown = "test".repeat(80);
export const aMessageContent = {
  markdown: aMessageBodyMarkdown,
  subject: "test".repeat(10),
};

const aPublicExtendedMessage: CreatedMessageWithoutContent = {
  created_at: aDate,
  fiscal_code: aNewMessageWithoutContent.fiscalCode,
  id: "A_MESSAGE_ID",
  sender_service_id: aNewMessageWithoutContent.senderServiceId,
  time_to_live: 3600 as TimeToLiveSeconds,
};

describe("mapMessageCategory", () => {
  test("should return GENERIC with a message containing that does not conain any category", () => {
    const r = mapMessageCategory(
      aPublicExtendedMessage,
      aMessageContent as MessageContent,
      getThirdPartyDataWithCategoryFetcher(dummyConfig, mockTelemetryClient),
    );
    expect(r.tag).toBe("GENERIC");
  });

  test("should return EU_COVID_CERT with a message containing a valid eu_covid_cert payload", () => {
    const r = mapMessageCategory(
      aPublicExtendedMessage,
      {
        ...aMessageContent,
        eu_covid_cert: { auth_code: "aCode" },
      } as MessageContent,
      getThirdPartyDataWithCategoryFetcher(dummyConfig, mockTelemetryClient),
    );
    expect(r.tag).toBe("EU_COVID_CERT");
  });

  test("should return GENERIC with a message containing a valid third_party_data payload with a non PN id", () => {
    const r = mapMessageCategory(
      aPublicExtendedMessage,
      {
        ...aMessageContent,
        third_party_data: { id: "aValidId" },
      } as MessageContent,
      getThirdPartyDataWithCategoryFetcher(dummyConfig, mockTelemetryClient),
    );
    expect(r.tag).toBe("GENERIC");
  });

  test("should return PN with a message sent from PN serviceId", () => {
    const r = mapMessageCategory(
      { ...aPublicExtendedMessage, sender_service_id: aPnServiceId },
      {
        ...aMessageContent,
        third_party_data: { id: "aMessageId" },
      } as MessageContent,
      getThirdPartyDataWithCategoryFetcher(dummyConfig, mockTelemetryClient),
    );
    expect(r.tag).toBe("PN");
  });

  //NB: this case should never exist, this test has been added to show that at the time of writing
  //a message can have more than one category during the CreateMessage flow but when is sent to the
  //app the first category pattern that match is used.
  //This can be a problem in the future if a service that send third-party messages will send for example
  //a payment_data payload, the app will never see that message as a payment message.
  test("should return EUCOVID_CERT with a message sent from PN that has a valid eu_covid_cert payload", () => {
    const r = mapMessageCategory(
      { ...aPublicExtendedMessage, sender_service_id: aPnServiceId },
      {
        ...aMessageContent,
        eu_covid_cert: { auth_code: "aCode" },
        third_party_data: { id: "aMessageId" },
      } as MessageContent,
      getThirdPartyDataWithCategoryFetcher(dummyConfig, mockTelemetryClient),
    );
    expect(r.tag).toBe("EU_COVID_CERT");
  });
});

describe("computeFlagFromHasPrecondition", () => {
  it("should return false if the has_precondition is NEVER an the message has not been read", () => {
    expect(
      computeFlagFromHasPrecondition(HasPreconditionEnum.NEVER, false),
    ).toBeFalsy();
  });

  it("should return false if the has_precondition is NEVER an the message has been read", () => {
    expect(
      computeFlagFromHasPrecondition(HasPreconditionEnum.NEVER, true),
    ).toBeFalsy();
  });

  it("should return false if the has_precondition is ONCE but it has been read", () => {
    expect(
      computeFlagFromHasPrecondition(HasPreconditionEnum.ONCE, true),
    ).toBeFalsy();
  });

  it("should return true if the has_precondition is ONCE and it has not been read", () => {
    expect(
      computeFlagFromHasPrecondition(HasPreconditionEnum.ONCE, false),
    ).toBeTruthy();
  });

  it("should return true if the has_precondition is ALWAYS and it has not been read", () => {
    expect(
      computeFlagFromHasPrecondition(HasPreconditionEnum.ALWAYS, false),
    ).toBeTruthy();
  });

  it("should return true if the has_precondition is ALWAYS and it has been read", () => {
    expect(
      computeFlagFromHasPrecondition(HasPreconditionEnum.ALWAYS, true),
    ).toBeTruthy();
  });
});
