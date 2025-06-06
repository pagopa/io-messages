import { NewProfile } from "@pagopa/io-functions-commons/dist/generated/definitions/NewProfile";
import { Profile } from "@pagopa/io-functions-commons/dist/generated/definitions/Profile";
import { ServicesPreferencesModeEnum } from "@pagopa/io-functions-commons/dist/generated/definitions/ServicesPreferencesMode";
import { ThirdPartyData } from "@pagopa/io-functions-commons/dist/generated/definitions/ThirdPartyData";
import {
  UserDataProcessingChoice,
  UserDataProcessingChoiceEnum,
} from "@pagopa/io-functions-commons/dist/generated/definitions/UserDataProcessingChoice";
import { UserDataProcessingChoiceRequest } from "@pagopa/io-functions-commons/dist/generated/definitions/UserDataProcessingChoiceRequest";
import {
  UserDataProcessingStatus,
  UserDataProcessingStatusEnum,
} from "@pagopa/io-functions-commons/dist/generated/definitions/UserDataProcessingStatus";
import { RetrievedProfile } from "@pagopa/io-functions-commons/dist/src/models/profile";
import {
  RetrievedUserDataProcessing,
  UserDataProcessingId,
  makeUserDataProcessingId,
} from "@pagopa/io-functions-commons/dist/src/models/user_data_processing";
import { CosmosResource } from "@pagopa/io-functions-commons/dist/src/utils/cosmosdb_model";
import { NonNegativeInteger } from "@pagopa/ts-commons/lib/numbers";
import {
  EmailString,
  FiscalCode,
  NonEmptyString,
} from "@pagopa/ts-commons/lib/strings";

export const aEmail = "email@example.com" as EmailString;
export const aEmailChanged = "email.changed@example.com" as EmailString;

export const aFiscalCode = "SPNDNL80A13Y555X" as FiscalCode;

// CosmosResourceMetadata
export const aCosmosResourceMetadata: Omit<CosmosResource, "id"> = {
  _etag: "_etag",
  _rid: "_rid",
  _self: "_self",
  _ts: 1,
};

export const aNewProfile: NewProfile = {
  email: aEmail,
  is_email_validated: true,
};

export const legacyApiProfileServicePreferencesSettings: Profile["service_preferences_settings"] =
  {
    mode: ServicesPreferencesModeEnum.LEGACY,
  };

export const autoApiProfileServicePreferencesSettings: Profile["service_preferences_settings"] =
  {
    mode: ServicesPreferencesModeEnum.AUTO,
  };

export const manualApiProfileServicePreferencesSettings: Profile["service_preferences_settings"] =
  {
    mode: ServicesPreferencesModeEnum.MANUAL,
  };

export const aProfile: Profile = {
  email: aEmail,
  is_email_enabled: true,
  is_inbox_enabled: false,
  is_webhook_enabled: false,
  service_preferences_settings: legacyApiProfileServicePreferencesSettings,
  version: 0 as NonNegativeInteger,
};

export const legacyProfileServicePreferencesSettings: RetrievedProfile["servicePreferencesSettings"] =
  {
    mode: ServicesPreferencesModeEnum.LEGACY,
    version: -1,
  };

export const autoProfileServicePreferencesSettings: RetrievedProfile["servicePreferencesSettings"] =
  {
    mode: ServicesPreferencesModeEnum.AUTO,
    version: 0 as NonNegativeInteger,
  };

export const manualProfileServicePreferencesSettings: RetrievedProfile["servicePreferencesSettings"] =
  {
    mode: ServicesPreferencesModeEnum.MANUAL,
    version: 1 as NonNegativeInteger,
  };

export const aRetrievedProfile: RetrievedProfile = {
  ...aCosmosResourceMetadata,
  fiscalCode: aFiscalCode,
  id: "123" as NonEmptyString,
  isEmailEnabled: true,
  isEmailValidated: true,
  isInboxEnabled: false,
  isTestProfile: false,
  isWebhookEnabled: false,
  kind: "IRetrievedProfile",
  servicePreferencesSettings: legacyProfileServicePreferencesSettings,
  version: 0 as NonNegativeInteger,
};

export const aRetrievedProfileWithEmail: RetrievedProfile = {
  ...aCosmosResourceMetadata,
  email: "email@example.com" as EmailString,
  fiscalCode: aFiscalCode,
  id: "123" as NonEmptyString,
  isEmailEnabled: true,
  isInboxEnabled: false,
  isWebhookEnabled: false,
  kind: "IRetrievedProfile",
  servicePreferencesSettings: legacyProfileServicePreferencesSettings,
  version: 0 as NonNegativeInteger,
};

export const aNewDate = new Date();

export const aTokenId = "01DQ79RZ0EQ0S7RTA3SMCKRCCA";
export const aValidator = "d6e57ed8d3c3eb4583d671c7";
export const aValidatorHash =
  "35aef908716592e5dd48ccc4f58ef1a286de8dfd58d9a7a050cf47c60b662154";

export const aUserDataProcessingChoice: UserDataProcessingChoice =
  UserDataProcessingChoiceEnum.DOWNLOAD;

export const aUserDataProcessingChoiceRequest: UserDataProcessingChoiceRequest =
  {
    choice: aUserDataProcessingChoice,
  };

export const aUserDataProcessingId: UserDataProcessingId =
  makeUserDataProcessingId(aUserDataProcessingChoice, aFiscalCode);

export const aUserDataProcessingStatus: UserDataProcessingStatus =
  UserDataProcessingStatusEnum.PENDING;

export const aWipUserDataProcessingStatus: UserDataProcessingStatus =
  UserDataProcessingStatusEnum.WIP;

export const aClosedUserDataProcessingStatus: UserDataProcessingStatus =
  UserDataProcessingStatusEnum.CLOSED;

export const aAbortedUserDataProcessingStatus: UserDataProcessingStatus =
  UserDataProcessingStatusEnum.ABORTED;

export const aRetrievedUserDataProcessing: RetrievedUserDataProcessing = {
  ...aCosmosResourceMetadata,
  choice: aUserDataProcessingChoice,
  createdAt: aNewDate,
  fiscalCode: aFiscalCode,
  id: "xyz" as NonEmptyString,
  kind: "IRetrievedUserDataProcessing",
  status: aUserDataProcessingStatus,
  updatedAt: aNewDate,
  userDataProcessingId: aUserDataProcessingId,
  version: 0 as NonNegativeInteger,
};

export const aClosedRetrievedUserDataProcessing: RetrievedUserDataProcessing = {
  ...aRetrievedUserDataProcessing,
  status: aClosedUserDataProcessingStatus,
};

export const aWipRetrievedUserDataProcessing: RetrievedUserDataProcessing = {
  ...aRetrievedUserDataProcessing,
  status: aWipUserDataProcessingStatus,
};

export const aAbortedRetrievedUserDataProcessing: RetrievedUserDataProcessing =
  {
    ...aRetrievedUserDataProcessing,
    status: aAbortedUserDataProcessingStatus,
  };

export const aPnThirdPartyData: ThirdPartyData = {
  has_attachments: true,
  has_remote_content: true,
  id: "a-pn-id" as NonEmptyString,
  original_receipt_date: new Date(),
  original_sender: "an-original-sender" as NonEmptyString,
  summary: "a-summary" as NonEmptyString,
};
