import { ActivationStatusEnum } from "@pagopa/io-functions-commons/dist/generated/definitions/ActivationStatus";
import { ServiceId } from "@pagopa/io-functions-commons/dist/generated/definitions/ServiceId";
import { ServicePreference } from "@pagopa/io-functions-commons/dist/generated/definitions/ServicePreference";
import { Activation } from "@pagopa/io-functions-commons/dist/src/models/activation";
import { RetrievedService } from "@pagopa/io-functions-commons/dist/src/models/service";
import {
  AccessReadMessageStatusEnum,
  NewServicePreference,
  RetrievedServicePreference,
  makeServicesPreferencesDocumentId,
} from "@pagopa/io-functions-commons/dist/src/models/service_preference";
import { NonNegativeInteger } from "@pagopa/ts-commons/lib/numbers";

import { aCosmosResourceMetadata, aFiscalCode } from "./mocks";

export const aServiceId = "aServiceId" as ServiceId;
export const aServicePreferenceVersion = 0 as NonNegativeInteger;

export const aNewServicePreference: NewServicePreference = {
  accessReadMessageStatus: AccessReadMessageStatusEnum.ALLOW,
  fiscalCode: aFiscalCode,
  id: makeServicesPreferencesDocumentId(
    aFiscalCode,
    aServiceId,
    aServicePreferenceVersion,
  ),
  isEmailEnabled: true,
  isInboxEnabled: true,
  isWebhookEnabled: true,
  kind: "INewServicePreference",
  serviceId: aServiceId,
  settingsVersion: aServicePreferenceVersion,
};
export const aRetrievedServicePreference: RetrievedServicePreference = {
  ...aCosmosResourceMetadata,
  ...aNewServicePreference,
  kind: "IRetrievedServicePreference",
};

export const aServicePreference: ServicePreference = {
  can_access_message_read_status: true,
  is_email_enabled: true,
  is_inbox_enabled: true,
  is_webhook_enabled: true,
  settings_version: aServicePreferenceVersion,
};

export const aRetrievedService: RetrievedService = {
  ...aCosmosResourceMetadata,
  isVisible: true,
  organizationFiscalCode: "99999999999",
  organizationName: "a Organization",
  serviceId: aServiceId,
  serviceName: "a Service",
} as any as RetrievedService;

export const anActiveActivation: Activation = {
  ...aCosmosResourceMetadata,
  fiscalCode: aFiscalCode,
  serviceId: aServiceId,
  status: ActivationStatusEnum.ACTIVE,
};
