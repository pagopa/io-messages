import { HasPreconditionEnum } from "@pagopa/io-functions-commons/dist/generated/definitions/HasPrecondition";
import {
  RCConfiguration,
  RCConfigurationModel,
  RetrievedRCConfiguration,
} from "@pagopa/io-functions-commons/dist/src/models/rc_configuration";
import { NonNegativeInteger } from "@pagopa/ts-commons/lib/numbers";
import { NonEmptyString, Ulid } from "@pagopa/ts-commons/lib/strings";
import * as O from "fp-ts/lib/Option";
import * as TE from "fp-ts/lib/TaskEither";
import { vi } from "vitest";

import { RCConfigurationBase } from "../generated/definitions/RCConfigurationBase";
import { RCConfigurationPublic } from "../generated/definitions/RCConfigurationPublic";
import { IConfig } from "../utils/config";
import { aCosmosResourceMetadata, aFiscalCode } from "./mocks";

export const mockRCConfigurationTtl = 100 as NonNegativeInteger;

const aDetailAuthentication = {
  headerKeyName: "a" as NonEmptyString,
  key: "key" as NonEmptyString,
  type: "type" as NonEmptyString,
};

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
  userId: "01HMRBX079WA5SGYBQP1A7FSKK" as NonEmptyString,
  ...aCosmosResourceMetadata,
};

export const mockConfig = { SERVICE_CACHE_TTL_DURATION: 3600 } as IConfig;

export const findByConfigurationIdMock = vi
  .fn()
  .mockImplementation(() =>
    TE.of(O.some(aRetrievedRCConfigurationWithBothEnv)),
  );

export const mockFind = vi.fn(() => TE.of(O.some(aRetrievedRCConfiguration)));

export const mockRCConfigurationModel = {
  find: mockFind,
  findByConfigurationId: findByConfigurationIdMock,
} as unknown as RCConfigurationModel;

const aRCEnvironmentConfiguration = {
  base_url: "https://anydomain.anytld/api/v1/anyapi" as NonEmptyString,
  details_authentication: {
    header_key_name: "X-Functions-Key" as NonEmptyString,
    key: "anykey" as NonEmptyString,
    type: "API_KEY" as NonEmptyString,
  },
};

const aRCConfigurationWithNoEnv: RCConfigurationBase = {
  configuration_id: "01HMRBX079WA5SGYBQP1A7FSKH" as Ulid,
  description: "a simple description" as NonEmptyString,
  disable_lollipop_for: [],
  has_precondition: HasPreconditionEnum.ALWAYS,
  is_lollipop_enabled: false,
  name: "aName" as NonEmptyString,
};

export const aRCConfigurationWithProdEnv: RCConfigurationPublic = {
  ...aRCConfigurationWithNoEnv,
  prod_environment: aRCEnvironmentConfiguration,
};

export const aRCConfigurationWithBothEnv: RCConfigurationPublic = {
  ...aRCConfigurationWithNoEnv,
  prod_environment: aRCEnvironmentConfiguration,
  test_environment: {
    ...aRCEnvironmentConfiguration,
    test_users: [],
  },
};

const aRCConfigurationEnvironmentModel = {
  baseUrl: "https://anydomain.anytld/api/v1/anyapi" as NonEmptyString,
  detailsAuthentication: {
    headerKeyName: "X-Functions-Key" as NonEmptyString,
    key: "anykey" as NonEmptyString,
    type: "API_KEY" as NonEmptyString,
  },
};

const aRCConfiguration: RCConfiguration = {
  configurationId: "01HMRBX079WA5SGYBQP1A7FSKH" as Ulid,
  description: "a simple description" as NonEmptyString,
  disableLollipopFor: [],
  hasPrecondition: HasPreconditionEnum.ALWAYS,
  id: "01HMRBX079WA5SGYBQP1A7FSKH" as NonEmptyString,
  isLollipopEnabled: false,
  name: "aName" as NonEmptyString,
  prodEnvironment: aRCConfigurationEnvironmentModel,
  testEnvironment: {
    ...aRCConfigurationEnvironmentModel,
    testUsers: [],
  },
  userId: "aUserId" as NonEmptyString,
};

export const aRetrievedRCConfigurationWithBothEnv: RetrievedRCConfiguration = {
  ...aRCConfiguration,
  _etag: "_etag",
  _rid: "_rid",
  _self: "_self",
  _ts: 1,
  id: `${aRCConfiguration.configurationId}` as NonEmptyString,
};
