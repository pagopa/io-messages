import { HasPreconditionEnum } from "@pagopa/io-functions-commons/dist/generated/definitions/HasPrecondition";
import {
  RCConfiguration,
  RCConfigurationModel,
  RetrievedRCConfiguration,
} from "@pagopa/io-functions-commons/dist/src/models/rc_configuration";
import {
  RetrievedUserRCConfiguration,
  UserRCConfiguration,
  UserRCConfigurationModel,
} from "@pagopa/io-functions-commons/dist/src/models/user_rc_configuration";
import { NonEmptyString, Ulid } from "@pagopa/ts-commons/lib/strings";
import { vi } from "vitest";

import { FiscalCode } from "../generated/definitions/FiscalCode";
import { NewRCConfigurationPublic } from "../generated/definitions/NewRCConfigurationPublic";
import { MANAGE_SUBSCRIPTION_PREFIX } from "../utils/apim";
import { ALLOWED_RC_CONFIG_API_GROUP } from "../utils/remote_content";
import { aCosmosResourceMetadata } from "./models.mock";

const aPublicDetailAuthentication = {
  header_key_name: "a" as NonEmptyString,
  key: "key" as NonEmptyString,
  type: "type" as NonEmptyString,
};

const aDetailAuthentication = {
  headerKeyName: "a" as NonEmptyString,
  key: "key" as NonEmptyString,
  type: "type" as NonEmptyString,
};

export const aUserId = "aUserId" as NonEmptyString;
export const aSubscriptionId = "aSubscriptionId" as NonEmptyString;
export const aManageSubscriptionId =
  `${MANAGE_SUBSCRIPTION_PREFIX}${aSubscriptionId}` as NonEmptyString;
export const someUserGroups = "GroupA,GroupB,GroupC" as NonEmptyString;
export const someUserGroupsWithTheAllowedOne =
  `${someUserGroups},${ALLOWED_RC_CONFIG_API_GROUP}` as NonEmptyString;

export const aRemoteContentConfiguration: RCConfiguration = {
  configurationId: "01HNG1XBMT8V6HWGF5T053K9RJ" as Ulid,
  description: "a description" as NonEmptyString,
  disableLollipopFor: [],
  hasPrecondition: HasPreconditionEnum.ALWAYS,
  id: "01HNG1XBMT8V6HWGF5T053K9RK" as NonEmptyString,
  isLollipopEnabled: false,
  name: "aRemoteContentConfiguration" as NonEmptyString,
  prodEnvironment: {
    baseUrl: "aValidUrl" as NonEmptyString,
    detailsAuthentication: aDetailAuthentication,
  },
  userId: aUserId,
};

export const anotherRemoteContentConfiguration: RCConfiguration = {
  configurationId: "01HNG1XBMT8V6HWGF5T053K9RK" as Ulid,
  description: "a description" as NonEmptyString,
  disableLollipopFor: [],
  hasPrecondition: HasPreconditionEnum.ALWAYS,
  id: "01HNG1XBMT8V6HWGF5T053K9RK" as NonEmptyString,
  isLollipopEnabled: false,
  name: "aRemoteContentConfiguration" as NonEmptyString,
  prodEnvironment: {
    baseUrl: "aValidUrl" as NonEmptyString,
    detailsAuthentication: aDetailAuthentication,
  },
  userId: aUserId,
};

export const aRetrievedRemoteContentConfiguration: RetrievedRCConfiguration = {
  ...aRemoteContentConfiguration,
  ...aCosmosResourceMetadata,
  id: `${aRemoteContentConfiguration.configurationId}` as NonEmptyString,
};

export const aPublicRemoteContentConfiguration: NewRCConfigurationPublic = {
  description: "a description" as NonEmptyString,
  disable_lollipop_for: [],
  has_precondition: HasPreconditionEnum.ALWAYS,
  is_lollipop_enabled: false,
  name: "aRemoteContentConfiguration" as NonEmptyString,
  prod_environment: {
    base_url: "aValidUrl" as NonEmptyString,
    details_authentication: aPublicDetailAuthentication,
  },
};

export const allConfigurations: readonly RCConfiguration[] = [
  aRemoteContentConfiguration,
  anotherRemoteContentConfiguration,
];

export const aUserRCC: UserRCConfiguration = {
  id: "01HNG1XBMT8V6HWGF5T053K9RK" as NonEmptyString,
  userId: aUserId,
};

export const anotherUserRCC: UserRCConfiguration = {
  id: "01HNG1XBMT8V6HWGF5T053K9RJ" as NonEmptyString,
  userId: aUserId,
};

export const aUserRCCList: readonly RetrievedUserRCConfiguration[] = [
  { ...aUserRCC, ...aCosmosResourceMetadata },
  { ...anotherUserRCC, ...aCosmosResourceMetadata },
];

const aFiscalCode = "FRLFRC74E04B157I" as FiscalCode;

export const aRetrievedRCConfiguration: RetrievedRCConfiguration = {
  configurationId: "01HMRBX079WA5SGYBQP1A7FSKH" as Ulid,
  description: "description" as NonEmptyString,
  disableLollipopFor: [aFiscalCode],
  hasPrecondition: HasPreconditionEnum.ALWAYS,
  id: "01HMRBX079WA5SGYBQP1A7FSKH" as NonEmptyString,
  isLollipopEnabled: true,
  name: "name" as NonEmptyString,
  prodEnvironment: {
    baseUrl: "aValidUrl" as NonEmptyString,
    detailsAuthentication: aDetailAuthentication,
  },
  userId: aUserId,
  ...aCosmosResourceMetadata,
};

export const createNewConfigurationMock = vi.fn();
export const upsertConfigurationMock = vi.fn();
export const findByConfigurationIdMock = vi.fn();
export const findAllByConfigurationId = vi.fn();

export const rccModelMock = {
  create: createNewConfigurationMock,
  findAllByConfigurationId: findAllByConfigurationId,
  findByConfigurationId: findByConfigurationIdMock,
  upsert: upsertConfigurationMock,
} as unknown as RCConfigurationModel;

export const findAllByUserId = vi.fn();

export const userRCCModelMock = {
  findAllByUserId: findAllByUserId,
} as unknown as UserRCConfigurationModel;
