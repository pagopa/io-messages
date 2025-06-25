/* eslint-disable no-console */
import { Context } from "@azure/functions";
import { ActivationStatusEnum } from "@pagopa/io-functions-commons/dist/generated/definitions/ActivationStatus";
import { BlockedInboxOrChannelEnum } from "@pagopa/io-functions-commons/dist/generated/definitions/BlockedInboxOrChannel";
import { RejectedMessageStatusValueEnum } from "@pagopa/io-functions-commons/dist/generated/definitions/RejectedMessageStatusValue";
import { RejectionReasonEnum } from "@pagopa/io-functions-commons/dist/generated/definitions/RejectionReason";
import { ServiceId } from "@pagopa/io-functions-commons/dist/generated/definitions/ServiceId";
import { SpecialServiceCategoryEnum } from "@pagopa/io-functions-commons/dist/generated/definitions/SpecialServiceCategory";
import {
  ActivationModel,
  RetrievedActivation,
} from "@pagopa/io-functions-commons/dist/src/models/activation";
import { MessageModel } from "@pagopa/io-functions-commons/dist/src/models/message";
import * as MS from "@pagopa/io-functions-commons/dist/src/models/message_status";
import {
  ProfileModel,
  RetrievedProfile,
} from "@pagopa/io-functions-commons/dist/src/models/profile";
import { ServicesPreferencesModel } from "@pagopa/io-functions-commons/dist/src/models/service_preference";
import { CosmosErrors } from "@pagopa/io-functions-commons/dist/src/utils/cosmosdb_model";
import {
  NonNegativeInteger,
  NonNegativeNumber,
} from "@pagopa/ts-commons/lib/numbers";
import { readableReport } from "@pagopa/ts-commons/lib/reporters";
import {
  NonEmptyString,
  OrganizationFiscalCode,
} from "@pagopa/ts-commons/lib/strings";
import { Second } from "@pagopa/ts-commons/lib/units";
import { subSeconds } from "date-fns";
import * as E from "fp-ts/lib/Either";
import * as O from "fp-ts/lib/Option";
import * as TE from "fp-ts/lib/TaskEither";
import { pipe } from "fp-ts/lib/function";
import * as lolex from "lolex";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  aCreatedMessageEventSenderMetadata,
  aDisabledServicePreference,
  aFiscalCode,
  aMessageContent,
  aNewMessageWithoutContent,
  aRetrievedMessage,
  aRetrievedProfile,
  aRetrievedServicePreference,
  aServiceId,
  anEnabledServicePreference,
  autoProfileServicePreferencesSettings,
  legacyProfileServicePreferencesSettings,
  manualProfileServicePreferencesSettings,
} from "../../../__mocks__/mocks";
import { initTelemetryClient } from "../../../utils/appinsights";
import { DEFAULT_PENDING_ACTIVATION_GRACE_PERIOD_SECONDS } from "../../../utils/config";
import {
  CommonMessageData,
  CreatedMessageEvent,
  ProcessedMessageEvent,
} from "../../../utils/events/message";
import { getProcessMessageHandler } from "../handler";

function fail(message: string) {
  throw new Error(message);
}

const TTL_FOR_USER_NOT_FOUND = 94670856 as NonNegativeInteger;

const createContext = (functionName = "funcname"): Context =>
  ({
    bindings: {},
    executionContext: { functionName },
    // eslint-disable no-console
    log: { ...console, error: vi.fn(), verbose: vi.fn(), warn: vi.fn() },
  }) as unknown as Context;

const mockTelemetryClient = {
  trackEvent: vi.fn(),
} as unknown as ReturnType<typeof initTelemetryClient>;

const findLastVersionByModelIdMock = vi
  .fn()
  .mockImplementation(() => TE.of(O.some(aRetrievedProfile)));
const lProfileModel = {
  findLastVersionByModelId: findLastVersionByModelIdMock,
} as unknown as ProfileModel;

const aBlobResult = {
  name: "ABlobName",
};

const storeContentAsBlobMock = vi.fn(() => TE.of(O.some(aBlobResult)));
const upsertMessageMock = vi.fn<any>(() => TE.of(aRetrievedMessage));
const patchMessageMock = vi.fn<any>(() => TE.right(aRetrievedMessage));
const lMessageModel = {
  patch: patchMessageMock,
  storeContentAsBlob: storeContentAsBlobMock,
  upsert: upsertMessageMock,
} as unknown as MessageModel;

const findServicePreferenceMock = vi.fn(() =>
  TE.of(O.some(aRetrievedServicePreference)),
);
const lServicePreferencesModel = {
  find: findServicePreferenceMock,
} as unknown as ServicesPreferencesModel;

const updateTTLForAllVersionsMock = vi.fn<any>(() => TE.right(1));
const lMessageStatusModel = {
  findLastVersionByModelId: () => TE.right(O.none),
  updateTTLForAllVersions: updateTTLForAllVersionsMock,
  upsert: () => TE.of({}),
} as unknown as MS.MessageStatusModel;

const messageStatusUpdaterMock = vi.fn(
  (
    status: MS.MessageStatusUpdate,
  ): TE.TaskEither<CosmosErrors, MS.RetrievedMessageStatus> =>
    TE.right({
      _etag: "a",
      _rid: "a",
      _self: "self",
      _ts: 0,
      id: "aMessageStatusId",
      kind: "IRetrievedMessageStatus",
      messageId: "aMessageId",
      version: 0 as NonNegativeInteger,
      ...status,
      fiscalCode: aFiscalCode,
      isArchived: false,
      isRead: false,
      updatedAt: new Date(),
    } as MS.RetrievedMessageStatus),
);

const activationFindLastVersionMock = vi.fn();
const lActivation = {
  findLastVersionByModelId: activationFindLastVersionMock,
} as unknown as ActivationModel;

const lastUpdateTimestamp = Math.floor(new Date().getTime() / 1000);
const aFutureOptOutEmailSwitchDate = new Date(lastUpdateTimestamp + 10);

const aPastOptOutEmailSwitchDate = new Date(lastUpdateTimestamp - 10);

const anOrgFiscalCode = "01111111111" as OrganizationFiscalCode;

const aPaymentData = {
  amount: 1000,
  invalid_after_due_date: false,
  notice_number: "177777777777777777",
};

const aPaymentDataWithPayee = {
  ...aPaymentData,
  payee: {
    fiscal_code: anOrgFiscalCode,
  },
};

const aCreatedMessageEvent: CreatedMessageEvent = {
  messageId: aNewMessageWithoutContent.id,
  serviceVersion: 1 as NonNegativeNumber,
};

const aMessageContentWithPaymentData = {
  ...aMessageContent,
  payment_data: aPaymentData,
};

const aMessageContentWithPaymentDataWithPayee = {
  ...aMessageContent,
  payment_data: aPaymentDataWithPayee,
};
const aRetrievedProfileWithAValidTimestamp = {
  ...aRetrievedProfile,
  _ts: lastUpdateTimestamp,
};

const aRetrievedProfileWithLegacyPreferences = {
  ...aRetrievedProfileWithAValidTimestamp,
  servicePreferencesSettings: legacyProfileServicePreferencesSettings,
};

const aRetrievedProfileWithManualPreferences = {
  ...aRetrievedProfileWithAValidTimestamp,
  servicePreferencesSettings: manualProfileServicePreferencesSettings,
};

const aRetrievedProfileWithAutoPreferences = {
  ...aRetrievedProfileWithAValidTimestamp,
  servicePreferencesSettings: autoProfileServicePreferencesSettings,
};

// utility that adds a given set of serviceIds to the profile's inbox blacklist
const withBlacklist = (
  profile: RetrievedProfile,
  services: ServiceId[] = [],
) => ({
  ...profile,
  blockedInboxOrChannels: services.reduce(
    (obj, serviceId) => ({
      ...obj,
      [serviceId]: [BlockedInboxOrChannelEnum.INBOX],
    }),
    {},
  ),
});

const withBlockedEmail = (
  profile: RetrievedProfile,
  services: ServiceId[] = [],
) => ({
  ...profile,
  blockedInboxOrChannels: services.reduce(
    (obj, serviceId) => ({
      ...obj,
      [serviceId]: [BlockedInboxOrChannelEnum.EMAIL],
    }),
    {},
  ),
});

const aCommonMessageData: CommonMessageData = {
  content: aMessageContent,
  message: aNewMessageWithoutContent,
  senderMetadata: aCreatedMessageEventSenderMetadata,
};
const aSpecialMessageData: CommonMessageData = {
  ...aCommonMessageData,
  senderMetadata: {
    ...aCommonMessageData.senderMetadata,
    serviceCategory: SpecialServiceCategoryEnum.SPECIAL,
  },
};

// Advanced Messages

// Ensure that ProcessMessage will handle messages during the switch
// between old model (without featureLevelType) and new one (with featureLevelType)
const { ...aMessageWithoutFeatureLevelType } = aNewMessageWithoutContent;
const aCommonMessageDataWithoutFeatureLevelType: CommonMessageData = {
  content: aMessageContent,
  message: aMessageWithoutFeatureLevelType as any,
  senderMetadata: aCreatedMessageEventSenderMetadata,
};

const mockRetrieveProcessingMessageData = vi.fn(() =>
  TE.of(O.some(aCommonMessageData)),
);

const aDisabledActivation: RetrievedActivation = {
  _etag: "a",
  _rid: "a",
  _self: "self",
  _ts: 0,
  fiscalCode: aFiscalCode,
  id: "fake-id" as NonEmptyString,
  kind: "IRetrievedActivation",
  serviceId: aServiceId,
  status: ActivationStatusEnum.INACTIVE,
  version: 0 as NonNegativeInteger,
};

const anActiveActivation: RetrievedActivation = {
  ...aDisabledActivation,
  status: ActivationStatusEnum.ACTIVE,
};

const aPendingActivation: RetrievedActivation = {
  ...aDisabledActivation,
  status: ActivationStatusEnum.PENDING,
};

let clock: any;
const ExecutionDateContext = Date.now();
beforeEach(() => {
  vi.mock(
    "@pagopa/io-functions-commons/dist/src/models/message_status",
    () => ({
      getMessageStatusUpdater: () => messageStatusUpdaterMock,
    }),
  );
  patchMessageMock.mockReturnValue(TE.right(aRetrievedMessage));
  updateTTLForAllVersionsMock.mockReturnValue(TE.right(1));
  // we usually prefer clearAllMocks, but tests scenarios are somehow entangled
  //  we should refactor them to have them independent, however for now we keep the workaround
  vi.resetAllMocks();
  clock = lolex.install({ now: ExecutionDateContext });
});

afterEach(() => {
  clock = clock.uninstall();
});

//eslint-disable-next-line max-lines-per-function
describe("getprocessMessageHandler", () => {
  it.each`
    scenario                                                                                                                               | profileResult                                                                                            | storageResult  | upsertResult         | preferenceResult                                                    | activationResult                                                                                                                           | messageEvent            | messageData            | expectedBIOC                         | optOutEmailSwitchDate           | optInEmailEnabled | overrideProfileResult
    ${"a retrieved profile mantaining its original isEmailEnabled property"}                                                               | ${aRetrievedProfileWithAValidTimestamp}                                                                  | ${aBlobResult} | ${aRetrievedMessage} | ${O.some(aRetrievedServicePreference)}                              | ${"not-called"}                                                                                                                            | ${aCreatedMessageEvent} | ${aCommonMessageData}  | ${[]}                                | ${aPastOptOutEmailSwitchDate}   | ${false}          | ${"O.none"}
    ${"retrieved profile with isEmailEnabled to false"}                                                                                    | ${{ ...aRetrievedProfile, isEmailEnabled: false }}                                                       | ${aBlobResult} | ${aRetrievedMessage} | ${O.some(aRetrievedServicePreference)}                              | ${"not-called"}                                                                                                                            | ${aCreatedMessageEvent} | ${aCommonMessageData}  | ${[]}                                | ${aPastOptOutEmailSwitchDate}   | ${false}          | ${"O.none"}
    ${"empty blockedInboxOrChannels if message sender service does not exists in user service preference (AUTO SETTINGS)"}                 | ${withBlacklist(aRetrievedProfileWithAutoPreferences, [aNewMessageWithoutContent.senderServiceId])}      | ${aBlobResult} | ${aRetrievedMessage} | ${O.none}                                                           | ${"not-called"}                                                                                                                            | ${aCreatedMessageEvent} | ${aCommonMessageData}  | ${[]}                                | ${aPastOptOutEmailSwitchDate}   | ${false}          | ${"O.none"}
    ${"empty blockedInboxOrChannels if message sender service exists and is enabled in user service preference (AUTO SETTINGS)"}           | ${aRetrievedProfileWithAutoPreferences}                                                                  | ${aBlobResult} | ${aRetrievedMessage} | ${O.some(anEnabledServicePreference)}                               | ${"not-called"}                                                                                                                            | ${aCreatedMessageEvent} | ${aCommonMessageData}  | ${[]}                                | ${aPastOptOutEmailSwitchDate}   | ${false}          | ${"O.none"}
    ${"a blocked EMAIL if sender service exists and has EMAIL disabled in user service preference (AUTO SETTINGS)"}                        | ${withBlacklist(aRetrievedProfileWithAutoPreferences, [aNewMessageWithoutContent.senderServiceId])}      | ${aBlobResult} | ${aRetrievedMessage} | ${O.some({ ...anEnabledServicePreference, isEmailEnabled: false })} | ${"not-called"}                                                                                                                            | ${aCreatedMessageEvent} | ${aCommonMessageData}  | ${[BlockedInboxOrChannelEnum.EMAIL]} | ${aPastOptOutEmailSwitchDate}   | ${false}          | ${"O.none"}
    ${"empty blockedInboxOrChannels if message sender service exists and is enabled in user service preference (MANUAL SETTINGS)"}         | ${aRetrievedProfileWithManualPreferences}                                                                | ${aBlobResult} | ${aRetrievedMessage} | ${O.some(anEnabledServicePreference)}                               | ${"not-called"}                                                                                                                            | ${aCreatedMessageEvent} | ${aCommonMessageData}  | ${[]}                                | ${aPastOptOutEmailSwitchDate}   | ${false}          | ${"O.none"}
    ${"blocked EMAIL if message sender service exists and has EMAIL disabled in user service preference (MANUAL SETTINGS)"}                | ${aRetrievedProfileWithAutoPreferences}                                                                  | ${aBlobResult} | ${aRetrievedMessage} | ${O.some({ ...anEnabledServicePreference, isEmailEnabled: false })} | ${"not-called"}                                                                                                                            | ${aCreatedMessageEvent} | ${aCommonMessageData}  | ${[BlockedInboxOrChannelEnum.EMAIL]} | ${aPastOptOutEmailSwitchDate}   | ${false}          | ${"O.none"}
    ${"blocked EMAIL for a service in blockedInboxOrChannels with email disabled (LEGACY SETTINGS)"}                                       | ${withBlockedEmail(aRetrievedProfileWithLegacyPreferences, [aNewMessageWithoutContent.senderServiceId])} | ${aBlobResult} | ${aRetrievedMessage} | ${"not-called"}                                                     | ${"not-called"}                                                                                                                            | ${aCreatedMessageEvent} | ${aCommonMessageData}  | ${[BlockedInboxOrChannelEnum.EMAIL]} | ${aPastOptOutEmailSwitchDate}   | ${false}          | ${"O.none"}
    ${"empty blockedInboxOrChannels if the service is not in user's blockedInboxOrChannels (LEGACY SETTINGS)"}                             | ${withBlacklist(aRetrievedProfileWithLegacyPreferences, ["another-service" as ServiceId])}               | ${aBlobResult} | ${aRetrievedMessage} | ${"not-called"}                                                     | ${"not-called"}                                                                                                                            | ${aCreatedMessageEvent} | ${aCommonMessageData}  | ${[]}                                | ${aPastOptOutEmailSwitchDate}   | ${false}          | ${"O.none"}
    ${"isEmailEnabled overridden to false if profile's timestamp is before optOutEmailSwitchDate"}                                         | ${aRetrievedProfileWithAValidTimestamp}                                                                  | ${aBlobResult} | ${aRetrievedMessage} | ${"not-called"}                                                     | ${"not-called"}                                                                                                                            | ${aCreatedMessageEvent} | ${aCommonMessageData}  | ${[]}                                | ${aFutureOptOutEmailSwitchDate} | ${true}           | ${{ ...aRetrievedProfileWithAValidTimestamp, isEmailEnabled: false }}
    ${"isEmailEnabled not overridden if profile's timestamp is after optOutEmailSwitchDate"}                                               | ${aRetrievedProfileWithAValidTimestamp}                                                                  | ${aBlobResult} | ${aRetrievedMessage} | ${"not-called"}                                                     | ${"not-called"}                                                                                                                            | ${aCreatedMessageEvent} | ${aCommonMessageData}  | ${[]}                                | ${aPastOptOutEmailSwitchDate}   | ${true}           | ${"O.none"}
    ${"empty blockedInboxOrChannels if message sender special service exists and is enabled in user service preference (AUTO SETTINGS)"}   | ${aRetrievedProfileWithAutoPreferences}                                                                  | ${aBlobResult} | ${aRetrievedMessage} | ${O.some(anEnabledServicePreference)}                               | ${O.some(anActiveActivation)}                                                                                                              | ${aCreatedMessageEvent} | ${aSpecialMessageData} | ${[]}                                | ${aPastOptOutEmailSwitchDate}   | ${false}          | ${"O.none"}
    ${"a blocked EMAIL if sender special service exists and has EMAIL disabled in user service preference (AUTO SETTINGS)"}                | ${withBlacklist(aRetrievedProfileWithAutoPreferences, [aNewMessageWithoutContent.senderServiceId])}      | ${aBlobResult} | ${aRetrievedMessage} | ${O.some({ ...anEnabledServicePreference, isEmailEnabled: false })} | ${O.some(anActiveActivation)}                                                                                                              | ${aCreatedMessageEvent} | ${aSpecialMessageData} | ${[BlockedInboxOrChannelEnum.EMAIL]} | ${aPastOptOutEmailSwitchDate}   | ${false}          | ${"O.none"}
    ${"empty blockedInboxOrChannels if message sender special service exists and is enabled in user service preference (MANUAL SETTINGS)"} | ${aRetrievedProfileWithManualPreferences}                                                                | ${aBlobResult} | ${aRetrievedMessage} | ${O.some(anEnabledServicePreference)}                               | ${O.some(anActiveActivation)}                                                                                                              | ${aCreatedMessageEvent} | ${aSpecialMessageData} | ${[]}                                | ${aPastOptOutEmailSwitchDate}   | ${false}          | ${"O.none"}
    ${"blocked EMAIL if message sender special service exists and has EMAIL disabled in user service preference (MANUAL SETTINGS)"}        | ${aRetrievedProfileWithAutoPreferences}                                                                  | ${aBlobResult} | ${aRetrievedMessage} | ${O.some({ ...anEnabledServicePreference, isEmailEnabled: false })} | ${O.some(anActiveActivation)}                                                                                                              | ${aCreatedMessageEvent} | ${aSpecialMessageData} | ${[BlockedInboxOrChannelEnum.EMAIL]} | ${aPastOptOutEmailSwitchDate}   | ${false}          | ${"O.none"}
    ${"empty blockedInboxOrChannels if message sender special service with pending activation within grace period (AUTO SETTINGS)"}        | ${aRetrievedProfileWithAutoPreferences}                                                                  | ${aBlobResult} | ${aRetrievedMessage} | ${O.some(anEnabledServicePreference)}                               | ${O.some({ ...aPendingActivation, _ts: subSeconds(ExecutionDateContext, DEFAULT_PENDING_ACTIVATION_GRACE_PERIOD_SECONDS - 1).getTime() })} | ${aCreatedMessageEvent} | ${aSpecialMessageData} | ${[]}                                | ${aPastOptOutEmailSwitchDate}   | ${false}          | ${"O.none"}
  `(
    "should succeed with $scenario",
    async ({
      activationResult,
      expectedBIOC,
      messageData,
      messageEvent,
      optInEmailEnabled,
      optOutEmailSwitchDate,
      overrideProfileResult,
      preferenceResult,
      profileResult,
      skipActivationMock = activationResult === "not-called",
      //   we use "not-called" to determine such
      // mock implementation must be set only if we expect the function to be called, otherwise it will interfere with other tests
      storageResult,
      upsertResult,
    }) => {
      findLastVersionByModelIdMock.mockImplementationOnce(() =>
        TE.of(O.some(profileResult)),
      );
      storeContentAsBlobMock.mockImplementationOnce(() =>
        TE.of(O.some(storageResult)),
      );
      upsertMessageMock.mockImplementationOnce(() =>
        TE.of(O.some(upsertResult)),
      );
      findServicePreferenceMock.mockImplementationOnce(() =>
        TE.of(preferenceResult),
      );
      activationFindLastVersionMock.mockImplementationOnce(() =>
        TE.of(activationResult),
      );
      mockRetrieveProcessingMessageData.mockImplementationOnce(() =>
        TE.of(O.some(messageData)),
      );

      const processMessageHandler = getProcessMessageHandler({
        TTL_FOR_USER_NOT_FOUND,
        isOptInEmailEnabled: optInEmailEnabled,
        lActivation,
        lBlobService: {} as any,
        lMessageModel,
        lMessageStatusModel,
        lProfileModel,
        lServicePreferencesModel,
        optOutEmailSwitchDate,
        pendingActivationGracePeriod:
          DEFAULT_PENDING_ACTIVATION_GRACE_PERIOD_SECONDS as Second,
        retrieveProcessingMessageData: mockRetrieveProcessingMessageData,
        telemetryClient: mockTelemetryClient,
      });

      const context = createContext();

      await processMessageHandler(context, JSON.stringify(messageEvent));

      pipe(
        context.bindings.processedMessage,
        ProcessedMessageEvent.decode,
        E.fold(
          (err) => fail(`Wrong result: ${readableReport(err)}`),
          (result) => {
            expect(result.blockedInboxOrChannels).toEqual(expectedBIOC);
            expect(result.profile).toEqual(
              overrideProfileResult === "O.none"
                ? profileResult
                : overrideProfileResult,
            );
          },
        ),
      );

      // success means message has been stored and status has been updated
      expect(upsertMessageMock).toHaveBeenCalledTimes(1);
      expect(storeContentAsBlobMock).toHaveBeenCalledTimes(1);
      expect(activationFindLastVersionMock).toBeCalledTimes(
        skipActivationMock ? 0 : 1,
      );
      expect(patchMessageMock).not.toHaveBeenCalled();
      expect(updateTTLForAllVersionsMock).not.toHaveBeenCalled();
    },
  );

  it.each`
    scenario                                           | preferenceResult                       | activationResult | messageEvent            | messageData                                                                    | optOutEmailSwitchDate         | optInEmailEnabled | expectedMessagePaymentData                                                                                | profileResult                           | storageResult  | upsertResult
    ${"with original payment message with payee"}      | ${O.some(aRetrievedServicePreference)} | ${"not-called"}  | ${aCreatedMessageEvent} | ${{ ...aCommonMessageData, content: aMessageContentWithPaymentDataWithPayee }} | ${aPastOptOutEmailSwitchDate} | ${false}          | ${aPaymentDataWithPayee}                                                                                  | ${aRetrievedProfileWithAValidTimestamp} | ${aBlobResult} | ${aRetrievedMessage}
    ${"with overridden payee if no payee is provided"} | ${O.some(aRetrievedServicePreference)} | ${"not-called"}  | ${aCreatedMessageEvent} | ${{ ...aCommonMessageData, content: aMessageContentWithPaymentData }}          | ${aPastOptOutEmailSwitchDate} | ${false}          | ${{ ...aPaymentData, payee: { fiscal_code: aCreatedMessageEventSenderMetadata.organizationFiscalCode } }} | ${aRetrievedProfileWithAValidTimestamp} | ${aBlobResult} | ${aRetrievedMessage}
    ${"with a no payment message"}                     | ${O.none}                              | ${"not-called"}  | ${aCreatedMessageEvent} | ${aCommonMessageData}                                                          | ${aPastOptOutEmailSwitchDate} | ${false}          | ${undefined}                                                                                              | ${aRetrievedProfileWithAValidTimestamp} | ${aBlobResult} | ${aRetrievedMessage}
    ${"a message without featureLevelType field"}      | ${O.none}                              | ${"not-called"}  | ${aCreatedMessageEvent} | ${aCommonMessageDataWithoutFeatureLevelType}                                   | ${aPastOptOutEmailSwitchDate} | ${false}          | ${undefined}                                                                                              | ${aRetrievedProfileWithAValidTimestamp} | ${aBlobResult} | ${aRetrievedMessage}
  `(
    "should succeed with $scenario",
    async ({
      activationResult,
      expectedMessagePaymentData,
      messageData,
      messageEvent,
      optInEmailEnabled,
      optOutEmailSwitchDate,
      preferenceResult,
      profileResult,
      // mock implementation must be set only if we expect the function to be called, otherwise it will interfere with other tests
      storageResult,
      upsertResult,
    }) => {
      findLastVersionByModelIdMock.mockImplementationOnce(() =>
        TE.of(O.some(profileResult)),
      );
      storeContentAsBlobMock.mockImplementationOnce(() =>
        TE.of(O.some(storageResult)),
      );
      upsertMessageMock.mockImplementationOnce(() =>
        TE.of(O.some(upsertResult)),
      );
      findServicePreferenceMock.mockImplementationOnce(() =>
        TE.of(preferenceResult),
      );
      activationFindLastVersionMock.mockImplementationOnce(() =>
        TE.of(activationResult),
      );

      mockRetrieveProcessingMessageData.mockImplementationOnce(() =>
        TE.of(O.some(messageData)),
      );

      const processMessageHandler = getProcessMessageHandler({
        TTL_FOR_USER_NOT_FOUND,
        isOptInEmailEnabled: optInEmailEnabled,
        lActivation,
        lBlobService: {} as any,
        lMessageModel,
        lMessageStatusModel,
        lProfileModel,
        lServicePreferencesModel,
        optOutEmailSwitchDate,
        pendingActivationGracePeriod:
          DEFAULT_PENDING_ACTIVATION_GRACE_PERIOD_SECONDS as Second,
        retrieveProcessingMessageData: mockRetrieveProcessingMessageData,
        telemetryClient: mockTelemetryClient,
      });

      const context = createContext();

      await processMessageHandler(context, JSON.stringify(messageEvent));

      pipe(
        context.bindings.processedMessage,
        ProcessedMessageEvent.decode,
        (result) => expect(E.isRight(result)).toBe(true),
      );

      const msgEvt = messageEvent as CreatedMessageEvent;
      // success means message has been stored and status has been updated
      expect(storeContentAsBlobMock).toHaveBeenCalledWith(
        {} as any,
        msgEvt.messageId,
        {
          ...aMessageContent,
          payment_data: expectedMessagePaymentData,
        },
      );
      expect(patchMessageMock).not.toHaveBeenCalled();
      expect(updateTTLForAllVersionsMock).not.toHaveBeenCalled();
    },
  );

  it.each`
    scenario                                                                                                                   | failureReason              | profileResult                                                                                                 | preferenceResult                                                 | activationResult                                                                                                                       | messageEvent            | messageData
    ${"no profile was found"}                                                                                                  | ${"PROFILE_NOT_FOUND"}     | ${O.none}                                                                                                     | ${"not-called"}                                                  | ${"not-called"}                                                                                                                        | ${aCreatedMessageEvent} | ${aCommonMessageData}
    ${"inbox is not enabled"}                                                                                                  | ${"MASTER_INBOX_DISABLED"} | ${O.some({ ...aRetrievedProfile, isInboxEnabled: false })}                                                    | ${"not-called"}                                                  | ${"not-called"}                                                                                                                        | ${aCreatedMessageEvent} | ${aCommonMessageData}
    ${"message sender is blocked"}                                                                                             | ${"SENDER_BLOCKED"}        | ${O.some(withBlacklist(aRetrievedProfile, [aNewMessageWithoutContent.senderServiceId]))}                      | ${"not-called"}                                                  | ${"not-called"}                                                                                                                        | ${aCreatedMessageEvent} | ${aCommonMessageData}
    ${"message sender service exists and is not enabled in user service preference (AUTO SETTINGS)"}                           | ${"SENDER_BLOCKED"}        | ${O.some(aRetrievedProfileWithAutoPreferences)}                                                               | ${O.some(aDisabledServicePreference)}                            | ${"not-called"}                                                                                                                        | ${aCreatedMessageEvent} | ${aCommonMessageData}
    ${"message sender service exists and has INBOX disabled in user service preference (AUTO SETTINGS)"}                       | ${"SENDER_BLOCKED"}        | ${O.some(aRetrievedProfileWithAutoPreferences)}                                                               | ${O.some({ anEnabledServicePreference, isInboxEnabled: false })} | ${"not-called"}                                                                                                                        | ${aCreatedMessageEvent} | ${aCommonMessageData}
    ${"message sender service does not exists in user service preference (MANUAL SETTINGS)"}                                   | ${"SENDER_BLOCKED"}        | ${O.some(aRetrievedProfileWithManualPreferences)}                                                             | ${O.none}                                                        | ${"not-called"}                                                                                                                        | ${aCreatedMessageEvent} | ${aCommonMessageData}
    ${"message sender service exists and is not enabled in user service preference (MANUAL SETTINGS)"}                         | ${"SENDER_BLOCKED"}        | ${O.some(aRetrievedProfileWithManualPreferences)}                                                             | ${O.some(aDisabledServicePreference)}                            | ${"not-called"}                                                                                                                        | ${aCreatedMessageEvent} | ${aCommonMessageData}
    ${"message sender service exists and has INBOX disabled in user service preference (MANUAL SETTINGS)"}                     | ${"SENDER_BLOCKED"}        | ${O.some(aRetrievedProfileWithManualPreferences)}                                                             | ${O.some({ anEnabledServicePreference, isInboxEnabled: false })} | ${"not-called"}                                                                                                                        | ${aCreatedMessageEvent} | ${aCommonMessageData}
    ${"service in blockedInboxOrChannels with blocked INBOX (LEGACY SETTINGS)"}                                                | ${"SENDER_BLOCKED"}        | ${O.some(withBlacklist(aRetrievedProfileWithLegacyPreferences, [aNewMessageWithoutContent.senderServiceId]))} | ${"not-called"}                                                  | ${"not-called"}                                                                                                                        | ${aCreatedMessageEvent} | ${aCommonMessageData}
    ${"message sender special service does not exists in user service preference and Activation is INACTIVE"}                  | ${"SENDER_BLOCKED"}        | ${O.some(aRetrievedProfileWithManualPreferences)}                                                             | ${O.none}                                                        | ${O.some(aDisabledActivation)}                                                                                                         | ${aCreatedMessageEvent} | ${aSpecialMessageData}
    ${"message sender special service does not exists in user service preference and Activation not exists"}                   | ${"SENDER_BLOCKED"}        | ${O.some(aRetrievedProfileWithManualPreferences)}                                                             | ${O.none}                                                        | ${O.none}                                                                                                                              | ${aCreatedMessageEvent} | ${aSpecialMessageData}
    ${"message sender special service does not exists in user service preference and Activation is PENDING"}                   | ${"SENDER_BLOCKED"}        | ${O.some(aRetrievedProfileWithManualPreferences)}                                                             | ${O.none}                                                        | ${O.some(aPendingActivation)}                                                                                                          | ${aCreatedMessageEvent} | ${aSpecialMessageData}
    ${"message sender special service does not exists in user service preference and Activation is PENDING near grace period"} | ${"SENDER_BLOCKED"}        | ${O.some(aRetrievedProfileWithManualPreferences)}                                                             | ${O.none}                                                        | ${O.some({ ...aPendingActivation, _ts: subSeconds(ExecutionDateContext, DEFAULT_PENDING_ACTIVATION_GRACE_PERIOD_SECONDS).getTime() })} | ${aCreatedMessageEvent} | ${aSpecialMessageData}
    ${"message sender special service exists in user service preference and Activation is INACTIVE"}                           | ${"SENDER_BLOCKED"}        | ${O.some(aRetrievedProfileWithManualPreferences)}                                                             | ${O.some(anEnabledServicePreference)}                            | ${O.some(aDisabledActivation)}                                                                                                         | ${aCreatedMessageEvent} | ${aSpecialMessageData}
    ${"message sender special service exists in user service preference and Activation not exists"}                            | ${"SENDER_BLOCKED"}        | ${O.some(aRetrievedProfileWithManualPreferences)}                                                             | ${O.some(anEnabledServicePreference)}                            | ${O.none}                                                                                                                              | ${aCreatedMessageEvent} | ${aSpecialMessageData}
    ${"message sender special service exists in user service preference and Activation is PENDING"}                            | ${"SENDER_BLOCKED"}        | ${O.some(aRetrievedProfileWithManualPreferences)}                                                             | ${O.some(anEnabledServicePreference)}                            | ${O.some(aPendingActivation)}                                                                                                          | ${aCreatedMessageEvent} | ${aSpecialMessageData}
    ${"message sender special service exists in user service preference and Activation is PENDING near grace period"}          | ${"SENDER_BLOCKED"}        | ${O.some(aRetrievedProfileWithManualPreferences)}                                                             | ${O.some(anEnabledServicePreference)}                            | ${O.some({ ...aPendingActivation, _ts: subSeconds(ExecutionDateContext, DEFAULT_PENDING_ACTIVATION_GRACE_PERIOD_SECONDS).getTime() })} | ${aCreatedMessageEvent} | ${aSpecialMessageData}
  `(
    "should fail if $scenario",
    async ({
      activationResult,
      failureReason,
      messageData,
      messageEvent,
      preferenceResult,
      profileResult,
      // mock implementation must be set only if we expect the function to be called, otherwise it will interfere with other tests
      skipActivationMock = activationResult === "not-called",
      skipPreferenceMock = preferenceResult === "not-called",
      //   we use "not-called" to determine such
      skipProfileMock = profileResult === "not-called",
    }) => {
      findLastVersionByModelIdMock.mockImplementationOnce(() =>
        TE.of(profileResult),
      );
      findServicePreferenceMock.mockImplementationOnce(() =>
        TE.of(preferenceResult),
      );
      activationFindLastVersionMock.mockImplementationOnce(() =>
        TE.of(activationResult),
      );
      mockRetrieveProcessingMessageData.mockImplementationOnce(() =>
        TE.of(O.some(messageData)),
      );
      const processMessageHandler = getProcessMessageHandler({
        TTL_FOR_USER_NOT_FOUND,
        isOptInEmailEnabled: false,
        lActivation,
        lBlobService: {} as any,
        lMessageModel,
        lMessageStatusModel,
        lProfileModel,
        lServicePreferencesModel,
        optOutEmailSwitchDate: aPastOptOutEmailSwitchDate,
        pendingActivationGracePeriod:
          DEFAULT_PENDING_ACTIVATION_GRACE_PERIOD_SECONDS as Second,
        retrieveProcessingMessageData: mockRetrieveProcessingMessageData,
        telemetryClient: mockTelemetryClient,
      });

      const context = createContext();

      await processMessageHandler(context, JSON.stringify(messageEvent));

      const result = context.bindings.processedMessage;

      expect(result).toBe(undefined);

      expect(messageStatusUpdaterMock).toHaveBeenCalledTimes(1);

      expect(messageStatusUpdaterMock).toHaveBeenCalledWith({
        rejection_reason:
          failureReason === "PROFILE_NOT_FOUND"
            ? RejectionReasonEnum.USER_NOT_FOUND
            : RejectionReasonEnum.SERVICE_NOT_ALLOWED,
        status: RejectedMessageStatusValueEnum.REJECTED,
        ttl: O.isNone(profileResult) ? 94670856 : undefined, // we want ttl setted only in case the user does not exist
      });

      // check if models are being used only when expected
      expect(findLastVersionByModelIdMock).toBeCalledTimes(
        skipProfileMock ? 0 : 1,
      );
      expect(findServicePreferenceMock).toBeCalledTimes(
        skipPreferenceMock ? 0 : 1,
      );
      expect(activationFindLastVersionMock).toBeCalledTimes(
        skipActivationMock ? 0 : 1,
      );
      //only in the first scenario the ttl should be setted
      if (O.isSome(profileResult)) {
        expect(patchMessageMock).not.toHaveBeenCalled();
        expect(updateTTLForAllVersionsMock).not.toHaveBeenCalled();
      }
    },
  );

  it.each`
    scenario                                                         | profileResult                                            | storageResult                                                | upsertResult                                           | preferenceResult                                        | activationResult                                        | messageEvent            | messageData
    ${"input cannot be decoded"}                                     | ${"not-called"}                                          | ${"not-called"}                                              | ${"not-called"}                                        | ${"not-called"}                                         | ${"not-called"}                                         | ${{}}                   | ${aCommonMessageData}
    ${"there is an error while fetching profile"}                    | ${TE.left("Profile fetch error")}                        | ${"not-called"}                                              | ${"not-called"}                                        | ${"not-called"}                                         | ${"not-called"}                                         | ${aCreatedMessageEvent} | ${aCommonMessageData}
    ${"message store operation fails"}                               | ${TE.of(O.some(aRetrievedProfile))}                      | ${TE.left(new Error("Error while storing message content"))} | ${"not-called"}                                        | ${"not-called"}                                         | ${"not-called"}                                         | ${aCreatedMessageEvent} | ${aCommonMessageData}
    ${"message upsert fails"}                                        | ${TE.of(O.some(aRetrievedProfile))}                      | ${TE.of(O.some(aBlobResult))}                                | ${TE.left(new Error("Error while upserting message"))} | ${"not-called"}                                         | ${"not-called"}                                         | ${aCreatedMessageEvent} | ${aCommonMessageData}
    ${"user's service preference retrieval fails (AUTO)"}            | ${TE.of(O.some(aRetrievedProfileWithAutoPreferences))}   | ${"not-called"}                                              | ${"not-called"}                                        | ${TE.left(new Error("Error while reading preference"))} | ${"not-called"}                                         | ${aCreatedMessageEvent} | ${aCommonMessageData}
    ${"user's service preference retrieval fails (MANUAL SETTINGS)"} | ${TE.of(O.some(aRetrievedProfileWithManualPreferences))} | ${"not-called"}                                              | ${"not-called"}                                        | ${TE.left({ kind: "COSMOS_EMPTY_RESPONSE" })}           | ${"not-called"}                                         | ${aCreatedMessageEvent} | ${aCommonMessageData}
    ${"user's activation retrieval for a service fails"}             | ${TE.of(O.some(aRetrievedProfileWithManualPreferences))} | ${"not-called"}                                              | ${"not-called"}                                        | ${TE.of(O.none)}                                        | ${TE.left(new Error("Error while reading activation"))} | ${aCreatedMessageEvent} | ${aSpecialMessageData}
    ${"user's activation retrieval for a service fails"}             | ${TE.of(O.some(aRetrievedProfileWithManualPreferences))} | ${"not-called"}                                              | ${"not-called"}                                        | ${TE.of(O.none)}                                        | ${TE.left({ kind: "COSMOS_EMPTY_RESPONSE" })}           | ${aCreatedMessageEvent} | ${aSpecialMessageData}
  `(
    "should throw an Error if $scenario",
    async ({
      activationResult,
      messageData,
      messageEvent,
      preferenceResult,
      profileResult,
      skipActivationMock = activationResult === "not-called",
      skipPreferenceMock = preferenceResult === "not-called",
      // mock implementation must be set only if we expect the function to be called, otherwise it will interfere with other tests
      //   we use "not-called" to determine such
      skipProfileMock = profileResult === "not-called",
      storageResult,
      skipStorageMock = storageResult === "not-called",
      upsertResult,
      skipUpsertMock = upsertResult === "not-called",
    }) => {
      findLastVersionByModelIdMock.mockImplementationOnce(() => profileResult);
      storeContentAsBlobMock.mockImplementationOnce(() => storageResult);
      upsertMessageMock.mockImplementationOnce(() => upsertResult);
      findServicePreferenceMock.mockImplementationOnce(() => preferenceResult);
      activationFindLastVersionMock.mockImplementationOnce(
        () => activationResult,
      );
      mockRetrieveProcessingMessageData.mockImplementationOnce(() =>
        TE.of(O.some(messageData)),
      );
      const processMessageHandler = getProcessMessageHandler({
        TTL_FOR_USER_NOT_FOUND,
        isOptInEmailEnabled: false,
        lActivation,
        lBlobService: {} as any,
        lMessageModel,
        lMessageStatusModel,
        lProfileModel,
        lServicePreferencesModel,
        optOutEmailSwitchDate: aPastOptOutEmailSwitchDate,
        pendingActivationGracePeriod:
          DEFAULT_PENDING_ACTIVATION_GRACE_PERIOD_SECONDS as Second,
        retrieveProcessingMessageData: mockRetrieveProcessingMessageData,
        telemetryClient: mockTelemetryClient,
      });

      const context = createContext();

      await expect(
        processMessageHandler(context, JSON.stringify(messageEvent)),
      ).rejects.toThrow();

      // check if models are being used only when expected
      expect(findLastVersionByModelIdMock).toBeCalledTimes(
        skipProfileMock ? 0 : 1,
      );
      expect(storeContentAsBlobMock).toBeCalledTimes(skipStorageMock ? 0 : 1);
      expect(upsertMessageMock).toBeCalledTimes(skipUpsertMock ? 0 : 1);
      expect(findServicePreferenceMock).toBeCalledTimes(
        skipPreferenceMock ? 0 : 1,
      );
      expect(activationFindLastVersionMock).toBeCalledTimes(
        skipActivationMock ? 0 : 1,
      );
      // ensuring that ttl is never set in these scenarios
      expect(patchMessageMock).not.toHaveBeenCalled();
      expect(updateTTLForAllVersionsMock).not.toHaveBeenCalled();
    },
  );

  it.each`
    scenario                                                    | loggedError                                                                              | profileResult                                                     | preferenceResult
    ${"while storing PROCESSED status"}                         | ${'UPSERT_STATUS=PROCESSED|ERROR={"kind":"COSMOS_EMPTY_RESPONSE"}'}                      | ${TE.of(O.some(aRetrievedProfile))}                               | ${"not-called"}
    ${"while storing REJECTED status if PROFILE NOT FOUND"}     | ${'PROFILE_NOT_FOUND|UPSERT_STATUS=REJECTED|ERROR={"kind":"COSMOS_EMPTY_RESPONSE"}'}     | ${TE.of(O.none)}                                                  | ${"not-called"}
    ${"while storing REJECTED status if MASTER INBOX DISABLED"} | ${'MASTER_INBOX_DISABLED|UPSERT_STATUS=REJECTED|ERROR={"kind":"COSMOS_EMPTY_RESPONSE"}'} | ${TE.of(O.some({ ...aRetrievedProfile, isInboxEnabled: false }))} | ${"not-called"}
    ${"while storing REJECTED status if SENDER IS BLOCKED"}     | ${'SENDER_BLOCKED|UPSERT_STATUS=REJECTED|ERROR={"kind":"COSMOS_EMPTY_RESPONSE"}'}        | ${TE.of(O.some({ ...aRetrievedProfileWithAutoPreferences }))}     | ${TE.of(O.some(aDisabledServicePreference))}
  `(
    "should throw an Error if MessageStatus upsert fails $scenario",
    async ({
      loggedError,
      messageData = aCommonMessageData,
      messageEvent = aCreatedMessageEvent,
      preferenceResult,
      profileResult,
      // mock implementation must be set only if we expect the function to be called, otherwise it will interfere with other tests
      skipPreferenceMock = preferenceResult === "not-called",
      //   we use "not-called" to determine such
      skipProfileMock = profileResult === "not-called",
    }) => {
      findLastVersionByModelIdMock.mockImplementationOnce(() => profileResult);
      // upsertMessageMock.mockImplementationOnce(() => upsertResult);
      findServicePreferenceMock.mockImplementationOnce(() => preferenceResult);
      findServicePreferenceMock.mockImplementationOnce(() => preferenceResult);
      storeContentAsBlobMock.mockImplementationOnce(() =>
        TE.of(O.some(aBlobResult)),
      );
      messageStatusUpdaterMock.mockReturnValueOnce(
        TE.left({ kind: "COSMOS_EMPTY_RESPONSE" }),
      );
      mockRetrieveProcessingMessageData.mockImplementationOnce(() =>
        TE.of(O.some(messageData)),
      );
      const processMessageHandler = getProcessMessageHandler({
        TTL_FOR_USER_NOT_FOUND,
        isOptInEmailEnabled: false,
        lActivation,
        lBlobService: {} as any,
        lMessageModel,
        lMessageStatusModel,
        lProfileModel,
        lServicePreferencesModel,
        optOutEmailSwitchDate: aPastOptOutEmailSwitchDate,
        pendingActivationGracePeriod:
          DEFAULT_PENDING_ACTIVATION_GRACE_PERIOD_SECONDS as Second,
        retrieveProcessingMessageData: mockRetrieveProcessingMessageData,
        telemetryClient: mockTelemetryClient,
      });

      const funcName = "ProcessMessage";
      const context = createContext(funcName);

      await expect(
        processMessageHandler(context, JSON.stringify(messageEvent)),
      ).rejects.toThrow();

      // check if models are being used only when expected
      expect(findLastVersionByModelIdMock).toBeCalledTimes(
        skipProfileMock ? 0 : 1,
      );
      // expect(getMessageStatusUpdaterMock).toBeCalledTimes(1);
      expect(context.log.error).toHaveBeenCalledWith(
        `${funcName}|MESSAGE_ID=${messageEvent.messageId}|${loggedError}`,
      );

      expect(upsertMessageMock).toBeCalledTimes(0);
      expect(findServicePreferenceMock).toBeCalledTimes(
        skipPreferenceMock ? 0 : 1,
      );
      expect(activationFindLastVersionMock).toBeCalledTimes(0);
      expect(patchMessageMock).not.toHaveBeenCalled();
      expect(updateTTLForAllVersionsMock).not.toHaveBeenCalled();
    },
  );

  it("should end with rejection if profile is not found, and the ttl must be defined", async () => {
    findLastVersionByModelIdMock.mockImplementationOnce(() => TE.of(O.none));
    mockRetrieveProcessingMessageData.mockImplementationOnce(() =>
      TE.of(O.some(aCommonMessageData)),
    );
    const processMessageHandler = getProcessMessageHandler({
      TTL_FOR_USER_NOT_FOUND,
      isOptInEmailEnabled: false,
      lActivation,
      lBlobService: {} as any,
      lMessageModel,
      lMessageStatusModel,
      lProfileModel,
      lServicePreferencesModel,
      optOutEmailSwitchDate: aPastOptOutEmailSwitchDate,
      pendingActivationGracePeriod:
        DEFAULT_PENDING_ACTIVATION_GRACE_PERIOD_SECONDS as Second,
      retrieveProcessingMessageData: mockRetrieveProcessingMessageData,
      telemetryClient: mockTelemetryClient,
    });

    const context = createContext();

    await processMessageHandler(context, JSON.stringify(aCreatedMessageEvent));

    const result = context.bindings.processedMessage;

    expect(result).toBe(undefined);

    // expect(getMessageStatusUpdaterMock).toHaveBeenCalledTimes(1);
    expect(messageStatusUpdaterMock).toHaveBeenCalledTimes(1);
    expect(messageStatusUpdaterMock).toHaveBeenCalledWith({
      rejection_reason: "USER_NOT_FOUND",
      status: "REJECTED",
      ttl: 94670856,
    });
    const messageStatusUpdaterParam = messageStatusUpdaterMock.mock.calls[0][0];

    expect(messageStatusUpdaterParam).toEqual({
      rejection_reason: RejectionReasonEnum.USER_NOT_FOUND,
      status: RejectedMessageStatusValueEnum.REJECTED,
      ttl: 94670856,
    });

    // check if models are being used only when expected
    expect(findLastVersionByModelIdMock).toBeCalledTimes(1);
    expect(patchMessageMock).toBeCalledTimes(1);
    expect(patchMessageMock).toHaveBeenCalledWith(
      ["A_MESSAGE_ID", "AAABBB01C02D345D"],
      { ttl: 94670856 },
    );
    expect(updateTTLForAllVersionsMock).toBeCalledTimes(1);
    expect(updateTTLForAllVersionsMock).toHaveBeenCalledWith(
      ["A_MESSAGE_ID"],
      94670856,
    );
    expect(findServicePreferenceMock).toBeCalledTimes(0);
    expect(activationFindLastVersionMock).toBeCalledTimes(0);
  });

  it("should throw an error if the set of ttl on message fails", async () => {
    findLastVersionByModelIdMock.mockImplementationOnce(() => TE.of(O.none));
    mockRetrieveProcessingMessageData.mockImplementationOnce(() =>
      TE.of(O.some(aCommonMessageData)),
    );
    patchMessageMock.mockReturnValueOnce(TE.left({} as CosmosErrors));
    const processMessageHandler = getProcessMessageHandler({
      TTL_FOR_USER_NOT_FOUND,
      isOptInEmailEnabled: false,
      lActivation,
      lBlobService: {} as any,
      lMessageModel,
      lMessageStatusModel,
      lProfileModel,
      lServicePreferencesModel,
      optOutEmailSwitchDate: aPastOptOutEmailSwitchDate,
      pendingActivationGracePeriod:
        DEFAULT_PENDING_ACTIVATION_GRACE_PERIOD_SECONDS as Second,
      retrieveProcessingMessageData: mockRetrieveProcessingMessageData,
      telemetryClient: mockTelemetryClient,
    });

    const context = createContext();

    await expect(
      processMessageHandler(context, JSON.stringify(aCreatedMessageEvent)),
    ).rejects.toThrow("Error while setting the ttl");
  });

  it("should throw an error if the set of ttl on message status fails", async () => {
    findLastVersionByModelIdMock.mockImplementationOnce(() => TE.of(O.none));
    mockRetrieveProcessingMessageData.mockImplementationOnce(() =>
      TE.of(O.some(aCommonMessageData)),
    );
    updateTTLForAllVersionsMock.mockReturnValueOnce(
      TE.left({} as CosmosErrors),
    );
    const processMessageHandler = getProcessMessageHandler({
      TTL_FOR_USER_NOT_FOUND,
      isOptInEmailEnabled: false,
      lActivation,
      lBlobService: {} as any,
      lMessageModel,
      lMessageStatusModel,
      lProfileModel,
      lServicePreferencesModel,
      optOutEmailSwitchDate: aPastOptOutEmailSwitchDate,
      pendingActivationGracePeriod:
        DEFAULT_PENDING_ACTIVATION_GRACE_PERIOD_SECONDS as Second,
      retrieveProcessingMessageData: mockRetrieveProcessingMessageData,
      telemetryClient: mockTelemetryClient,
    });

    const context = createContext();

    await expect(
      processMessageHandler(context, JSON.stringify(aCreatedMessageEvent)),
    ).rejects.toThrow("Error while setting the ttl");
  });
});
