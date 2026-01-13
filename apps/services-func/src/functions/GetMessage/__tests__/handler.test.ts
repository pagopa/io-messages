/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable vitest/prefer-called-with */

import * as mc from "@/utils/message-content";
import { ExternalCreatedMessageWithoutContent } from "@pagopa/io-functions-commons/dist/generated/definitions/ExternalCreatedMessageWithoutContent";
import { ExternalMessageResponseWithoutContent } from "@pagopa/io-functions-commons/dist/generated/definitions/ExternalMessageResponseWithoutContent";
import { FeatureLevelTypeEnum } from "@pagopa/io-functions-commons/dist/generated/definitions/FeatureLevelType";
import { MaxAllowedPaymentAmount } from "@pagopa/io-functions-commons/dist/generated/definitions/MaxAllowedPaymentAmount";
import { NotRejectedMessageStatusValueEnum } from "@pagopa/io-functions-commons/dist/generated/definitions/NotRejectedMessageStatusValue";
import { NotificationChannelEnum } from "@pagopa/io-functions-commons/dist/generated/definitions/NotificationChannel";
import { NotificationChannelStatusValueEnum } from "@pagopa/io-functions-commons/dist/generated/definitions/NotificationChannelStatusValue";
import { ReadStatusEnum } from "@pagopa/io-functions-commons/dist/generated/definitions/ReadStatus";
import { ServiceId } from "@pagopa/io-functions-commons/dist/generated/definitions/ServiceId";
import { TimeToLiveSeconds } from "@pagopa/io-functions-commons/dist/generated/definitions/TimeToLiveSeconds";
import {
  NewMessageWithoutContent,
  RetrievedMessageWithoutContent,
} from "@pagopa/io-functions-commons/dist/src/models/message";
import { MessageStatus } from "@pagopa/io-functions-commons/dist/src/models/message_status";
import {
  NotificationAddressSourceEnum,
  RetrievedNotification,
} from "@pagopa/io-functions-commons/dist/src/models/notification";
import {
  RetrievedNotificationStatus,
  makeStatusId,
} from "@pagopa/io-functions-commons/dist/src/models/notification_status";
import { toAuthorizedCIDRs } from "@pagopa/io-functions-commons/dist/src/models/service";
import {
  IAzureApiAuthorization,
  UserGroup,
} from "@pagopa/io-functions-commons/dist/src/utils/middlewares/azure_api_auth";
import { IAzureUserAttributes } from "@pagopa/io-functions-commons/dist/src/utils/middlewares/azure_user_attributes";
import { NonNegativeInteger } from "@pagopa/ts-commons/lib/numbers";
import {
  EmailString,
  FiscalCode,
  NonEmptyString,
  OrganizationFiscalCode,
} from "@pagopa/ts-commons/lib/strings";
import { QueryError } from "documentdb";
import * as O from "fp-ts/Option";
import { Option, none, some } from "fp-ts/lib/Option";
import * as TE from "fp-ts/lib/TaskEither";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

import {
  aMessageContent,
  aMessageContentWithLegalData,
  aMessagePayload,
  aPaymentMessageContent,
} from "../../../__mocks__/mocks";
import { PaymentStatusEnum } from "../../../generated/definitions/PaymentStatus";
import { PartyConfigurationFaultEnum } from "../../../generated/pagopa-ecommerce/PartyConfigurationFault";
import {
  PartyConfigurationFaultPaymentProblemJson,
  FaultCodeCategoryEnum as faultCode,
} from "../../../generated/pagopa-ecommerce/PartyConfigurationFaultPaymentProblemJson";
import { PaymentDuplicatedStatusFaultEnum } from "../../../generated/pagopa-ecommerce/PaymentDuplicatedStatusFault";
import {
  FaultCodeCategoryEnum,
  PaymentDuplicatedStatusFaultPaymentProblemJson,
} from "../../../generated/pagopa-ecommerce/PaymentDuplicatedStatusFaultPaymentProblemJson";
import { GetMessageHandler } from "../handler";

// Tests
// -----------------------

// eslint-disable-next-line max-lines-per-function
describe("GetMessageHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  vi.useFakeTimers();

  // Read status checker
  const mockMessageReadStatusAuth = vi.fn();
  mockMessageReadStatusAuth.mockImplementation(() =>
    TE.of<Error, boolean>(false),
  );

  const getMockMessageReadStatusAuth = () =>
    vi.fn(() => TE.of<Error, boolean>(false));

  // -----------------------

  const mockContext = {
    log: {
      // eslint-disable-next-line no-console
      error: vi.fn(),
      // eslint-disable-next-line no-console
      info: vi.fn(),
      // eslint-disable-next-line no-console
      verbose: vi.fn(),
      // eslint-disable-next-line no-console
      warn: vi.fn(),
    },
  } as any;

  afterAll(() => {
    vi.useRealTimers();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(mc, "getContentFromBlob").mockReturnValue(
      TE.of(O.some(aPaymentMessageContent)),
    );
  });

  const aFiscalCode = "FRLFRC74E04B157I" as FiscalCode;
  const anOrganizationFiscalCode = "01234567890" as OrganizationFiscalCode;
  const anEmail = "test@example.com" as EmailString;

  const aDate = new Date();
  const someUserAttributes: IAzureUserAttributes = {
    email: anEmail,
    kind: "IAzureUserAttributes",
    service: {
      authorizedCIDRs: toAuthorizedCIDRs([]),
      authorizedRecipients: new Set([]),
      departmentName: "IT" as NonEmptyString,
      isVisible: true,
      maxAllowedPaymentAmount: 0 as MaxAllowedPaymentAmount,
      organizationFiscalCode: anOrganizationFiscalCode,
      organizationName: "AgID" as NonEmptyString,
      requireSecureChannels: false,
      serviceId: "test" as NonEmptyString,
      serviceName: "Test" as NonEmptyString,
      version: 1 as NonNegativeInteger,
    },
  };

  const aUserAuthenticationDeveloper: IAzureApiAuthorization = {
    groups: new Set([UserGroup.ApiMessageRead, UserGroup.ApiMessageWrite]),
    kind: "IAzureApiAuthorization",
    subscriptionId: "s123" as NonEmptyString,
    userId: "u123" as NonEmptyString,
  };

  const aUserAuthenticationLegalDeveloper: IAzureApiAuthorization = {
    groups: new Set([UserGroup.ApiLegalMessageRead]),
    kind: "IAzureApiAuthorization",
    subscriptionId: "s123" as NonEmptyString,
    userId: "u123" as NonEmptyString,
  };

  const aUserAuthenticationTrustedApplication: IAzureApiAuthorization = {
    groups: new Set([UserGroup.ApiMessageRead, UserGroup.ApiMessageList]),
    kind: "IAzureApiAuthorization",
    subscriptionId: "s123" as NonEmptyString,
    userId: "u123" as NonEmptyString,
  };

  const aUserAuthenticationTrustedApplicationWithAdvancedFetures: IAzureApiAuthorization =
    {
      groups: new Set([
        UserGroup.ApiMessageRead,
        UserGroup.ApiMessageList,
        UserGroup.ApiMessageReadAdvanced,
      ]),
      kind: "IAzureApiAuthorization",
      subscriptionId: "s123" as NonEmptyString,
      userId: "u123" as NonEmptyString,
    };

  const aMessageId = "A_MESSAGE_ID" as NonEmptyString;

  const aNewMessageWithoutContent: NewMessageWithoutContent = {
    createdAt: aDate,
    featureLevelType: FeatureLevelTypeEnum.STANDARD,
    fiscalCode: aFiscalCode,
    id: "A_MESSAGE_ID" as NonEmptyString,
    indexedId: "A_MESSAGE_ID" as NonEmptyString,
    isPending: true,
    kind: "INewMessageWithoutContent",
    senderServiceId: "test" as ServiceId,
    senderUserId: "u123" as NonEmptyString,
    timeToLiveSeconds: 3600 as TimeToLiveSeconds,
  };

  const aRetrievedMessageWithoutContent: RetrievedMessageWithoutContent = {
    ...aNewMessageWithoutContent,
    _etag: "_etag",
    _rid: "_rid",
    _self: "xyz",
    _ts: 1,
    kind: "IRetrievedMessageWithoutContent",
  };

  const aPublicExtendedMessage: ExternalCreatedMessageWithoutContent = {
    created_at: aDate,
    feature_level_type: FeatureLevelTypeEnum.STANDARD,
    fiscal_code: aNewMessageWithoutContent.fiscalCode,
    id: "A_MESSAGE_ID",
    sender_service_id: aNewMessageWithoutContent.senderServiceId,
    time_to_live: 3600 as TimeToLiveSeconds,
  };

  const aPublicExtendedMessageResponse: ExternalMessageResponseWithoutContent =
    {
      message: aPublicExtendedMessage,
      notification: {
        email: NotificationChannelStatusValueEnum.SENT,
        webhook: NotificationChannelStatusValueEnum.SENT,
      },
      status: NotRejectedMessageStatusValueEnum.ACCEPTED,
    };

  function getNotificationModelMock(
    aRetrievedNotification: any = {
      data: "data",
    },
  ): any {
    return {
      findNotificationForMessage: vi.fn(() =>
        TE.of(some(aRetrievedNotification)),
      ),
    };
  }

  const aRetrievedNotificationStatus: RetrievedNotificationStatus = {
    _etag: "_etag",
    _rid: "_rid",
    _self: "xyz",
    _ts: 1,
    channel: NotificationChannelEnum.EMAIL,
    id: "1" as NonEmptyString,
    kind: "IRetrievedNotificationStatus",
    messageId: "1" as NonEmptyString,
    notificationId: "1" as NonEmptyString,
    status: NotificationChannelStatusValueEnum.SENT,
    statusId: makeStatusId(
      "1" as NonEmptyString,
      NotificationChannelEnum.EMAIL,
    ),
    updatedAt: aDate,
    version: 1 as NonNegativeInteger,
  };

  const aMessageStatus: MessageStatus = {
    isArchived: false,
    isRead: false,
    messageId: aMessageId,
    status: NotRejectedMessageStatusValueEnum.ACCEPTED,
    updatedAt: aDate,
  };

  function getNotificationStatusModelMock(
    retrievedNotificationStatus: any = TE.of(
      some(aRetrievedNotificationStatus),
    ),
  ): any {
    return {
      findOneNotificationStatusByNotificationChannel: vi.fn(
        () => retrievedNotificationStatus,
      ),
    };
  }

  function getMessageStatusModelMock(
    s: TE.TaskEither<QueryError, Option<MessageStatus>> = TE.of(
      some(aMessageStatus),
    ),
  ): any {
    return {
      findLastVersionByModelId: vi.fn().mockReturnValue(s),
      upsert: vi.fn((status) => TE.left(status)),
    };
  }

  const getPagopaEcommerceClientMock = (
    status = 200,
    body?:
      | PartyConfigurationFaultPaymentProblemJson
      | PaymentDuplicatedStatusFaultPaymentProblemJson,
  ) => ({
    getCarts: vi.fn(),
    getPaymentRequestInfo: vi.fn().mockImplementation(() =>
      TE.right(
        body
          ? {
              status: status,
              value: body,
            }
          : {
              status: status,
            },
      )(),
    ),
  });

  it("should respond with a message if requesting user is the sender", async () => {
    const mockMessageModel = {
      findMessageForRecipient: vi.fn(() =>
        TE.of(some(aRetrievedMessageWithoutContent)),
      ),
      getContentFromBlob: vi.fn(() => TE.of(none)),
    };

    vi.spyOn(mc, "getContentFromBlob").mockReturnValue(TE.of(none));

    const getMessageHandler = GetMessageHandler(
      mockMessageModel as any,
      getMessageStatusModelMock(),
      getNotificationModelMock(),
      getNotificationStatusModelMock(),
      {} as any,
      mockMessageReadStatusAuth,
      getPagopaEcommerceClientMock(),
    );

    const result = await getMessageHandler(
      mockContext,
      aUserAuthenticationDeveloper,
      undefined as any, // not used
      someUserAttributes,
      aFiscalCode,
      aRetrievedMessageWithoutContent.id,
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

  it("should fail if any error occurs trying to retrieve the message content", async () => {
    const mockMessageModel = {
      findMessageForRecipient: vi.fn(() =>
        TE.of(some(aRetrievedMessageWithoutContent)),
      ),
      getContentFromBlob: vi.fn(() => TE.left(new Error())),
    };

    vi.spyOn(mc, "getContentFromBlob").mockReturnValue(TE.left(new Error()));

    const getMessageHandler = GetMessageHandler(
      mockMessageModel as any,
      getMessageStatusModelMock(),
      getNotificationModelMock(),
      getNotificationStatusModelMock(),
      {} as any,
      mockMessageReadStatusAuth,
      getPagopaEcommerceClientMock(),
    );

    const result = await getMessageHandler(
      mockContext,
      aUserAuthenticationDeveloper,
      undefined as any, // not used
      someUserAttributes,
      aFiscalCode,
      aRetrievedMessageWithoutContent.id,
    );

    expect(mc.getContentFromBlob).toHaveBeenCalledTimes(1);
    expect(mockMessageModel.findMessageForRecipient).toHaveBeenCalledTimes(1);
    expect(mockMessageModel.findMessageForRecipient).toHaveBeenCalledWith(
      aRetrievedMessageWithoutContent.fiscalCode,
      aRetrievedMessageWithoutContent.id,
    );

    expect(result.kind).toBe("IResponseErrorInternal");
  });

  it("should respond with a message if requesting user is a trusted application", async () => {
    const mockMessageModel = {
      findMessageForRecipient: vi.fn(() =>
        TE.of(some(aRetrievedMessageWithoutContent)),
      ),
      getContentFromBlob: vi.fn(() => TE.of(none)),
    };

    vi.spyOn(mc, "getContentFromBlob").mockReturnValue(TE.of(none));

    const getMessageHandler = GetMessageHandler(
      mockMessageModel as any,
      getMessageStatusModelMock(),
      getNotificationModelMock(),
      getNotificationStatusModelMock(),
      {} as any,
      mockMessageReadStatusAuth,
      getPagopaEcommerceClientMock(),
    );

    const result = await getMessageHandler(
      mockContext,
      aUserAuthenticationTrustedApplication,
      undefined as any, // not used
      someUserAttributes,
      aFiscalCode,
      aRetrievedMessageWithoutContent.id,
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

  it("should respond with forbidden if requesting user is not the sender", async () => {
    const message = {
      ...aRetrievedMessageWithoutContent,
      senderServiceId: "anotherOrg",
    };

    const mockMessageModel = {
      findMessageForRecipient: vi.fn(() => TE.of(some(message))),
      getContentFromBlob: vi.fn(() => TE.of(none)),
    };

    const getMessageHandler = GetMessageHandler(
      mockMessageModel as any,
      getMessageStatusModelMock(),
      {} as any,
      {} as any,
      {} as any,
      mockMessageReadStatusAuth,
      getPagopaEcommerceClientMock(),
    );

    const result = await getMessageHandler(
      mockContext,
      aUserAuthenticationDeveloper,
      undefined as any, // not used
      someUserAttributes,
      aFiscalCode,
      aRetrievedMessageWithoutContent.id,
    );

    expect(mockMessageModel.findMessageForRecipient).toHaveBeenCalledTimes(1);
    expect(mockMessageModel.findMessageForRecipient).toHaveBeenCalledWith(
      aRetrievedMessageWithoutContent.fiscalCode,
      aRetrievedMessageWithoutContent.id,
    );

    expect(result.kind).toBe("IResponseErrorForbiddenNotAuthorized");
    expect(result.detail).toContain(
      "You are not allowed to read this message, you can only read messages that you have sent",
    );
  });

  it("should respond with forbidden if requesting user is not allowed to see legal message", async () => {
    const message = {
      ...aRetrievedMessageWithoutContent,
      senderServiceId: "anotherOrg",
    };

    const mockMessageModel = {
      findMessageForRecipient: vi.fn(() => TE.of(some(message))),
      getContentFromBlob: vi.fn(() =>
        TE.of(some(aMessageContentWithLegalData)),
      ),
    };

    const getMessageHandler = GetMessageHandler(
      mockMessageModel as any,
      getMessageStatusModelMock(),
      {} as any,
      {} as any,
      {} as any,
      mockMessageReadStatusAuth,
      getPagopaEcommerceClientMock(),
    );

    const result = await getMessageHandler(
      mockContext,
      aUserAuthenticationDeveloper,
      undefined as any, // not used
      someUserAttributes,
      aFiscalCode,
      aRetrievedMessageWithoutContent.id,
    );

    expect(mockMessageModel.findMessageForRecipient).toHaveBeenCalledTimes(1);
    expect(mockMessageModel.findMessageForRecipient).toHaveBeenCalledWith(
      aRetrievedMessageWithoutContent.fiscalCode,
      aRetrievedMessageWithoutContent.id,
    );

    expect(result.kind).toBe("IResponseErrorForbiddenNotAuthorized");
    expect(result.detail).toContain(
      "You are not allowed to read this message, you can only read messages that you have sent",
    );
  });

  it("should respond with forbidden if requesting user is allowed to see legal_message but not other messages", async () => {
    const message = {
      ...aRetrievedMessageWithoutContent,
      senderServiceId: "anotherOrg",
    };

    const mockMessageModel = {
      findMessageForRecipient: vi.fn(() => TE.of(some(message))),
      getContentFromBlob: vi.fn(() => TE.of(some(aMessagePayload.content))),
    };

    const getMessageHandler = GetMessageHandler(
      mockMessageModel as any,
      getMessageStatusModelMock(),
      {} as any,
      {} as any,
      {} as any,
      mockMessageReadStatusAuth,
      getPagopaEcommerceClientMock(),
    );

    const result = await getMessageHandler(
      mockContext,
      aUserAuthenticationLegalDeveloper,
      undefined as any, // not used
      someUserAttributes,
      aFiscalCode,
      aRetrievedMessageWithoutContent.id,
    );

    expect(mockMessageModel.findMessageForRecipient).toHaveBeenCalledTimes(1);
    expect(mockMessageModel.findMessageForRecipient).toHaveBeenCalledWith(
      aRetrievedMessageWithoutContent.fiscalCode,
      aRetrievedMessageWithoutContent.id,
    );

    expect(result.kind).toBe("IResponseErrorForbiddenNotAuthorized");
  });

  it("should respond with Not Found if requesting user is allowed to see legal_message but message content is not stored yet", async () => {
    const message = {
      ...aRetrievedMessageWithoutContent,
      senderServiceId: "anotherOrg",
    };

    vi.spyOn(mc, "getContentFromBlob").mockReturnValueOnce(TE.of(none));

    const mockMessageModel = {
      findMessageForRecipient: vi.fn(() => TE.of(some(message))),
      getContentFromBlob: vi.fn(() => TE.of(none)),
    };

    const getMessageHandler = GetMessageHandler(
      mockMessageModel as any,
      getMessageStatusModelMock(),
      {} as any,
      {} as any,
      {} as any,
      mockMessageReadStatusAuth,
      getPagopaEcommerceClientMock(),
    );

    const result = await getMessageHandler(
      mockContext,
      aUserAuthenticationLegalDeveloper,
      undefined as any, // not used
      someUserAttributes,
      aFiscalCode,
      aRetrievedMessageWithoutContent.id,
    );

    expect(mockMessageModel.findMessageForRecipient).toHaveBeenCalledTimes(1);
    expect(mockMessageModel.findMessageForRecipient).toHaveBeenCalledWith(
      aRetrievedMessageWithoutContent.fiscalCode,
      aRetrievedMessageWithoutContent.id,
    );

    expect(result.kind).toBe("IResponseErrorNotFound");
  });

  it("should respond with a message with legal data if requesting user is allowed to see legal message", async () => {
    const mockMessageModel = {
      findMessageForRecipient: vi.fn(() =>
        TE.of(some(aRetrievedMessageWithoutContent)),
      ),
      getContentFromBlob: vi.fn(() =>
        TE.of(some(aMessageContentWithLegalData)),
      ),
    };

    vi.spyOn(mc, "getContentFromBlob").mockReturnValue(
      TE.of(O.some(aMessageContentWithLegalData)),
    );

    const getMessageHandler = GetMessageHandler(
      mockMessageModel as any,
      getMessageStatusModelMock(),
      getNotificationModelMock(),
      getNotificationStatusModelMock(),
      {} as any,
      mockMessageReadStatusAuth,
      getPagopaEcommerceClientMock(),
    );

    const result = await getMessageHandler(
      mockContext,
      aUserAuthenticationLegalDeveloper,
      undefined as any, // not used
      someUserAttributes,
      aFiscalCode,
      aRetrievedMessageWithoutContent.id,
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
          content: { ...aMessageContentWithLegalData },
          time_to_live: 3600,
        },
      });
    }
  });

  it("should respond with not found a message doesn not exist", async () => {
    const mockMessageModel = {
      findMessageForRecipient: vi.fn(() => TE.of(none)),
      getContentFromBlob: vi.fn(() => TE.of(none)),
    };

    const getMessageHandler = GetMessageHandler(
      mockMessageModel as any,
      getMessageStatusModelMock(),
      {} as any,
      {} as any,
      {} as any,
      mockMessageReadStatusAuth,
      getPagopaEcommerceClientMock(),
    );

    const result = await getMessageHandler(
      mockContext,
      aUserAuthenticationDeveloper,
      undefined as any, // not used
      someUserAttributes,
      aFiscalCode,
      aRetrievedMessageWithoutContent.id,
    );

    expect(mockMessageModel.findMessageForRecipient).toHaveBeenCalledTimes(1);

    expect(result.kind).toBe("IResponseErrorNotFound");
  });

  it("should provide information about notification status", async () => {
    const aRetrievedNotification: RetrievedNotification = {
      _etag: "_etag",
      _rid: "_rid",
      _self: "xyz",
      _ts: 1,
      channels: {
        [NotificationChannelEnum.EMAIL]: {
          addressSource: NotificationAddressSourceEnum.PROFILE_ADDRESS,
          toAddress: "x@example.com" as EmailString,
        },
      },
      fiscalCode: aFiscalCode,
      id: "A_NOTIFICATION_ID" as NonEmptyString,
      kind: "IRetrievedNotification",
      messageId: "A_MESSAGE_ID" as NonEmptyString,
    };

    const mockMessageModel = {
      findMessageForRecipient: vi.fn(() =>
        TE.of(some(aRetrievedMessageWithoutContent)),
      ),
      getContentFromBlob: vi.fn(() => TE.of(none)),
    };

    vi.spyOn(mc, "getContentFromBlob").mockReturnValue(TE.of(none));

    const getMessageHandler = GetMessageHandler(
      mockMessageModel as any,
      getMessageStatusModelMock(),
      getNotificationModelMock(aRetrievedNotification),
      getNotificationStatusModelMock(),
      {} as any,
      mockMessageReadStatusAuth,
      getPagopaEcommerceClientMock(),
    );

    const result = await getMessageHandler(
      mockContext,
      aUserAuthenticationTrustedApplication,
      undefined as any, // not used
      someUserAttributes,
      aFiscalCode,
      aRetrievedMessageWithoutContent.id,
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
      });
    }
  });

  it("should fail if any error occurs trying to retrieve the message status", async () => {
    const mockMessageModel = {
      findMessageForRecipient: vi.fn(() =>
        TE.of(some(aRetrievedMessageWithoutContent)),
      ),
      getContentFromBlob: vi.fn(() => TE.of(none)),
    };

    const getMessageHandler = GetMessageHandler(
      mockMessageModel as any,
      getMessageStatusModelMock(
        TE.left<QueryError, Option<MessageStatus>>({
          body: "error",
          code: 1,
        }),
      ),
      getNotificationModelMock(),
      getNotificationStatusModelMock(),
      {} as any,
      mockMessageReadStatusAuth,
      getPagopaEcommerceClientMock(),
    );

    const result = await getMessageHandler(
      mockContext,
      aUserAuthenticationDeveloper,
      undefined as any, // not used
      someUserAttributes,
      aFiscalCode,
      aRetrievedMessageWithoutContent.id,
    );

    expect(result.kind).toBe("IResponseErrorInternal");
  });

  it("should fail if any error occurs trying to retrieve the notification status", async () => {
    const mockMessageModel = {
      findMessageForRecipient: vi.fn(() =>
        TE.of(some(aRetrievedMessageWithoutContent)),
      ),
      getContentFromBlob: vi.fn(() => TE.of(none)),
    };

    const getMessageHandler = GetMessageHandler(
      mockMessageModel as any,
      getMessageStatusModelMock(),
      {
        findNotificationForMessage: vi.fn(() =>
          TE.left({
            body: "error",
            code: 1,
          }),
        ),
      } as any,
      getNotificationStatusModelMock(),
      {} as any,
      mockMessageReadStatusAuth,
      getPagopaEcommerceClientMock(),
    );

    const result = await getMessageHandler(
      mockContext,
      aUserAuthenticationDeveloper,
      undefined as any, // not used
      someUserAttributes,
      aFiscalCode,
      aRetrievedMessageWithoutContent.id,
    );

    expect(result.kind).toBe("IResponseErrorInternal");
  });

  // ---------------------------
  // Advanced Features
  // ---------------------------

  const aRetrievedNotification: RetrievedNotification = {
    _etag: "_etag",
    _rid: "_rid",
    _self: "xyz",
    _ts: 1,
    channels: {
      [NotificationChannelEnum.EMAIL]: {
        addressSource: NotificationAddressSourceEnum.PROFILE_ADDRESS,
        toAddress: "x@example.com" as EmailString,
      },
    },
    fiscalCode: aFiscalCode,
    id: "A_NOTIFICATION_ID" as NonEmptyString,
    kind: "IRetrievedNotification",
    messageId: "A_MESSAGE_ID" as NonEmptyString,
  };

  const aRetrievedMessageWithAdvancedFeatures = {
    ...aRetrievedMessageWithoutContent,
    featureLevelType: FeatureLevelTypeEnum.ADVANCED,
    isPending: false,
  };

  const aPublicExtendedMessageResponseWithContent = {
    ...aPublicExtendedMessageResponse,
    message: {
      ...aPublicExtendedMessageResponse.message,
      content: aMessageContent,
    },
  };

  const aPublicExtendedMessageResponseWithContentWithAdvancedFeatures = {
    ...aPublicExtendedMessageResponseWithContent,
    message: {
      ...aPublicExtendedMessageResponseWithContent.message,
      feature_level_type: FeatureLevelTypeEnum.ADVANCED,
    },
  };

  it("should NOT provide information about read and payment status if message is of type STANDARD", async () => {
    const mockMessageModel = {
      findMessageForRecipient: vi.fn(() =>
        TE.of(some({ ...aRetrievedMessageWithoutContent, isPending: false })),
      ),
      getContentFromBlob: vi.fn(() => TE.of(O.some(aMessageContent))),
    };

    vi.spyOn(mc, "getContentFromBlob").mockReturnValue(
      TE.of(O.some(aMessageContent)),
    );

    const getMessageHandler = GetMessageHandler(
      mockMessageModel as any,
      getMessageStatusModelMock(),
      getNotificationModelMock(aRetrievedNotification),
      getNotificationStatusModelMock(),
      {} as any,
      mockMessageReadStatusAuth,
      getPagopaEcommerceClientMock(),
    );

    const result = await getMessageHandler(
      mockContext,
      aUserAuthenticationTrustedApplicationWithAdvancedFetures,
      undefined as any, // not used
      someUserAttributes,
      aFiscalCode,
      aRetrievedMessageWithoutContent.id,
    );

    expect(mc.getContentFromBlob).toHaveBeenCalledTimes(1);
    expect(mockMessageModel.findMessageForRecipient).toHaveBeenCalledTimes(1);
    expect(mockMessageModel.findMessageForRecipient).toHaveBeenCalledWith(
      aRetrievedMessageWithoutContent.fiscalCode,
      aRetrievedMessageWithoutContent.id,
    );

    expect(result.kind).toBe("IResponseSuccessJson");
    if (result.kind === "IResponseSuccessJson") {
      expect(result.value).toEqual(aPublicExtendedMessageResponseWithContent);
      expect(result.value).not.toHaveProperty("read_status");
      expect(result.value).not.toHaveProperty("payment_status");
    }
  });

  it("should NOT provide information about read and payment status if user is not allowed (no 'ApiMessageReadAdvanced' auth group)", async () => {
    const mockMessageModel = {
      findMessageForRecipient: vi.fn(() =>
        TE.of(some(aRetrievedMessageWithAdvancedFeatures)),
      ),
      getContentFromBlob: vi.fn(() => TE.of(O.some(aMessageContent))),
    };
    vi.spyOn(mc, "getContentFromBlob").mockReturnValue(
      TE.of(O.some(aMessageContent)),
    );

    const getMessageHandler = GetMessageHandler(
      mockMessageModel as any,
      getMessageStatusModelMock(),
      getNotificationModelMock(aRetrievedNotification),
      getNotificationStatusModelMock(),
      {} as any,
      mockMessageReadStatusAuth,
      getPagopaEcommerceClientMock(),
    );

    const result = await getMessageHandler(
      mockContext,
      aUserAuthenticationTrustedApplication,
      undefined as any, // not used
      someUserAttributes,
      aFiscalCode,
      aRetrievedMessageWithoutContent.id,
    );

    expect(mc.getContentFromBlob).toHaveBeenCalledTimes(1);
    expect(mockMessageModel.findMessageForRecipient).toHaveBeenCalledTimes(1);
    expect(mockMessageModel.findMessageForRecipient).toHaveBeenCalledWith(
      aRetrievedMessageWithoutContent.fiscalCode,
      aRetrievedMessageWithoutContent.id,
    );
    expect(mockMessageReadStatusAuth).not.toHaveBeenCalled();

    expect(result.kind).toBe("IResponseSuccessJson");
    if (result.kind === "IResponseSuccessJson") {
      expect(result.value).toEqual({
        ...aPublicExtendedMessageResponseWithContentWithAdvancedFeatures,
      });
      expect(result.value).not.toHaveProperty("payment_status");
      expect(result.value).not.toHaveProperty("read_status");
    }
  });

  it("should NOT provide information about read status if message is pending", async () => {
    const mockMessageModel = {
      findMessageForRecipient: vi.fn(() =>
        TE.of(
          some({ ...aRetrievedMessageWithAdvancedFeatures, isPending: true }),
        ),
      ),
      getContentFromBlob: vi.fn(() => TE.of(O.some(aMessageContent))),
    };

    vi.spyOn(mc, "getContentFromBlob").mockReturnValue(
      TE.of(O.some(aMessageContent)),
    );

    mockMessageReadStatusAuth.mockReturnValueOnce(TE.right(true));

    const getMessageHandler = GetMessageHandler(
      mockMessageModel as any,
      getMessageStatusModelMock(),
      getNotificationModelMock(aRetrievedNotification),
      getNotificationStatusModelMock(),
      {} as any,
      mockMessageReadStatusAuth,
      getPagopaEcommerceClientMock(),
    );

    const result = await getMessageHandler(
      mockContext,
      aUserAuthenticationTrustedApplicationWithAdvancedFetures,
      undefined as any, // not used
      someUserAttributes,
      aFiscalCode,
      aRetrievedMessageWithoutContent.id,
    );

    expect(mc.getContentFromBlob).toHaveBeenCalledTimes(1);
    expect(mockMessageModel.findMessageForRecipient).toHaveBeenCalledTimes(1);
    expect(mockMessageModel.findMessageForRecipient).toHaveBeenCalledWith(
      aRetrievedMessageWithoutContent.fiscalCode,
      aRetrievedMessageWithoutContent.id,
    );
    expect(mockMessageReadStatusAuth).not.toHaveBeenCalled();

    expect(result.kind).toBe("IResponseSuccessJson");
    if (result.kind === "IResponseSuccessJson") {
      expect(result.value).toEqual({
        ...aPublicExtendedMessageResponseWithContentWithAdvancedFeatures,
      });

      expect(result.value).not.toHaveProperty("payment_status");
      expect(result.value).not.toHaveProperty("read_status");
    }
  });

  it("should provide information about read status if user is allowed and message is of type ADVANCED", async () => {
    const mockMessageModel = {
      findMessageForRecipient: vi.fn(() =>
        TE.of(
          some({ ...aRetrievedMessageWithAdvancedFeatures, isPending: false }),
        ),
      ),
      getContentFromBlob: vi.fn(() => TE.of(O.some(aMessageContent))),
    };
    vi.spyOn(mc, "getContentFromBlob").mockReturnValue(
      TE.of(O.some(aMessageContent)),
    );

    mockMessageReadStatusAuth.mockReturnValueOnce(TE.right(true));

    const getMessageHandler = GetMessageHandler(
      mockMessageModel as any,
      getMessageStatusModelMock(),
      getNotificationModelMock(aRetrievedNotification),
      getNotificationStatusModelMock(),
      {} as any,
      mockMessageReadStatusAuth,
      getPagopaEcommerceClientMock(),
    );

    const result = await getMessageHandler(
      mockContext,
      aUserAuthenticationTrustedApplicationWithAdvancedFetures,
      undefined as any, // not used
      someUserAttributes,
      aFiscalCode,
      aRetrievedMessageWithoutContent.id,
    );

    expect(mc.getContentFromBlob).toHaveBeenCalledTimes(1);
    expect(mockMessageModel.findMessageForRecipient).toHaveBeenCalledTimes(1);
    expect(mockMessageModel.findMessageForRecipient).toHaveBeenCalledWith(
      aRetrievedMessageWithoutContent.fiscalCode,
      aRetrievedMessageWithoutContent.id,
    );
    expect(mockMessageReadStatusAuth).toHaveBeenCalled();

    expect(result.kind).toBe("IResponseSuccessJson");
    if (result.kind === "IResponseSuccessJson") {
      expect(result.value).toEqual({
        ...aPublicExtendedMessageResponseWithContentWithAdvancedFeatures,
        payment_status: undefined,
        read_status: aMessageStatus.isRead
          ? ReadStatusEnum.READ
          : ReadStatusEnum.UNREAD,
      });
    }
  });

  it("should return UNAVAILABLE as read status if user is NOT allowed and message is of type ADVANCED", async () => {
    const mockMessageModel = {
      findMessageForRecipient: vi.fn(() =>
        TE.of(
          some({ ...aRetrievedMessageWithAdvancedFeatures, isPending: false }),
        ),
      ),
      getContentFromBlob: vi.fn(() => TE.of(O.some(aMessageContent))),
    };

    vi.spyOn(mc, "getContentFromBlob").mockReturnValue(
      TE.of(O.some(aMessageContent)),
    );

    // Using base mockMessageReadStatusAuth it's not working correctly
    const mockMessageReadStatusAuth = getMockMessageReadStatusAuth();
    mockMessageReadStatusAuth.mockReturnValueOnce(TE.of(false));

    const getMessageHandler = GetMessageHandler(
      mockMessageModel as any,
      getMessageStatusModelMock(),
      getNotificationModelMock(aRetrievedNotification),
      getNotificationStatusModelMock(),
      {} as any,
      mockMessageReadStatusAuth,
      getPagopaEcommerceClientMock(),
    );

    const result = await getMessageHandler(
      mockContext,
      aUserAuthenticationTrustedApplicationWithAdvancedFetures,
      undefined as any, // not used
      someUserAttributes,
      aFiscalCode,
      aRetrievedMessageWithoutContent.id,
    );

    expect(mc.getContentFromBlob).toHaveBeenCalledTimes(1);
    expect(mockMessageModel.findMessageForRecipient).toHaveBeenCalledTimes(1);
    expect(mockMessageModel.findMessageForRecipient).toHaveBeenCalledWith(
      aRetrievedMessageWithoutContent.fiscalCode,
      aRetrievedMessageWithoutContent.id,
    );
    expect(mockMessageReadStatusAuth).toHaveBeenCalled();

    expect(result.kind).toBe("IResponseSuccessJson");
    if (result.kind === "IResponseSuccessJson") {
      expect(result.value).toEqual({
        ...aPublicExtendedMessageResponseWithContentWithAdvancedFeatures,
        read_status: ReadStatusEnum.UNAVAILABLE,
      });
    }
  });

  it("should provide information about payment status if user is allowed and message is of type ADVANCED", async () => {
    const mockMessageModel = {
      findMessageForRecipient: vi.fn(() =>
        TE.of(some(aRetrievedMessageWithAdvancedFeatures)),
      ),
      getContentFromBlob: vi.fn(() => TE.of(O.some(aPaymentMessageContent))),
    };

    const getMessageHandler = GetMessageHandler(
      mockMessageModel as any,
      getMessageStatusModelMock(
        TE.of(
          some({
            ...aMessageStatus,
            status: NotRejectedMessageStatusValueEnum.PROCESSED,
          }),
        ),
      ),
      getNotificationModelMock(aRetrievedNotification),
      getNotificationStatusModelMock(),
      {} as any,
      mockMessageReadStatusAuth,
      getPagopaEcommerceClientMock(409, {
        faultCodeCategory: FaultCodeCategoryEnum.PAYMENT_DUPLICATED,
        faultCodeDetail:
          PaymentDuplicatedStatusFaultEnum.PAA_PAGAMENTO_DUPLICATO,
      }),
    );

    const result = await getMessageHandler(
      mockContext,
      aUserAuthenticationTrustedApplicationWithAdvancedFetures,
      undefined as any, // not used
      someUserAttributes,
      aFiscalCode,
      aRetrievedMessageWithoutContent.id,
    );

    expect(mc.getContentFromBlob).toHaveBeenCalledTimes(1);
    expect(mockMessageModel.findMessageForRecipient).toHaveBeenCalledTimes(1);
    expect(mockMessageModel.findMessageForRecipient).toHaveBeenCalledWith(
      aRetrievedMessageWithoutContent.fiscalCode,
      aRetrievedMessageWithoutContent.id,
    );

    expect(result.kind).toBe("IResponseSuccessJson");
    if (result.kind === "IResponseSuccessJson") {
      expect(result.value).toEqual(
        expect.objectContaining({
          payment_status: PaymentStatusEnum.PAID,
        }),
      );
    }
  });

  it("should provide default information about payment status if user is allowed and message is of type ADVANCED and message is not found in payment updater", async () => {
    const mockMessageModel = {
      findMessageForRecipient: vi.fn(() =>
        TE.of(some(aRetrievedMessageWithAdvancedFeatures)),
      ),
      getContentFromBlob: vi.fn(() => TE.of(O.some(aPaymentMessageContent))),
    };

    const getMessageHandler = GetMessageHandler(
      mockMessageModel as any,
      getMessageStatusModelMock(
        TE.of(
          some({
            ...aMessageStatus,
            status: NotRejectedMessageStatusValueEnum.PROCESSED,
          }),
        ),
      ),
      getNotificationModelMock(aRetrievedNotification),
      getNotificationStatusModelMock(),
      {} as any,
      mockMessageReadStatusAuth,
      getPagopaEcommerceClientMock(404),
    );

    const result = await getMessageHandler(
      mockContext,
      aUserAuthenticationTrustedApplicationWithAdvancedFetures,
      undefined as any, // not used
      someUserAttributes,
      aFiscalCode,
      aRetrievedMessageWithoutContent.id,
    );

    expect(mc.getContentFromBlob).toHaveBeenCalledTimes(1);
    expect(mockMessageModel.findMessageForRecipient).toHaveBeenCalledTimes(1);
    expect(mockMessageModel.findMessageForRecipient).toHaveBeenCalledWith(
      aRetrievedMessageWithoutContent.fiscalCode,
      aRetrievedMessageWithoutContent.id,
    );

    expect(result.kind).toBe("IResponseSuccessJson");
    if (result.kind === "IResponseSuccessJson") {
      expect(result.value).toEqual(
        expect.objectContaining({
          payment_status: PaymentStatusEnum.NOT_PAID,
        }),
      );
    }
  });

  it("should return an internal error if user is allowed and message is of type ADVANCED and payment updater is broken", async () => {
    const mockMessageModel = {
      findMessageForRecipient: vi.fn(() =>
        TE.of(some(aRetrievedMessageWithAdvancedFeatures)),
      ),
      getContentFromBlob: vi.fn(() => TE.of(O.some(aPaymentMessageContent))),
    };

    const getMessageHandler = GetMessageHandler(
      mockMessageModel as any,
      getMessageStatusModelMock(
        TE.of(
          some({
            ...aMessageStatus,
            status: NotRejectedMessageStatusValueEnum.PROCESSED,
          }),
        ),
      ),
      getNotificationModelMock(aRetrievedNotification),
      getNotificationStatusModelMock(),
      {} as any,
      mockMessageReadStatusAuth,
      getPagopaEcommerceClientMock(503, {
        faultCodeCategory: faultCode.DOMAIN_UNKNOWN,
        faultCodeDetail: PartyConfigurationFaultEnum.PAA_ID_DOMINIO_ERRATO,
        title: "UnexpectedError",
      }),
    );

    const result = await getMessageHandler(
      mockContext,
      aUserAuthenticationTrustedApplicationWithAdvancedFetures,
      undefined as any, // not used
      someUserAttributes,
      aFiscalCode,
      aRetrievedMessageWithoutContent.id,
    );

    expect(mc.getContentFromBlob).toHaveBeenCalledTimes(1);
    expect(mockMessageModel.findMessageForRecipient).toHaveBeenCalledTimes(1);
    expect(mockMessageModel.findMessageForRecipient).toHaveBeenCalledWith(
      aRetrievedMessageWithoutContent.fiscalCode,
      aRetrievedMessageWithoutContent.id,
    );

    expect(result).toEqual(
      expect.objectContaining({
        kind: "IResponseErrorInternal",
      }),
    );
  });
});
