import { NonNegativeInteger } from "@pagopa/ts-commons/lib/numbers";
import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";

import { IConfig } from "../utils/config";

export const envConfig: IConfig = {
  APPINSIGHTS_SAMPLING_PERCENTAGE: 5,
  APPLICATIONINSIGHTS_CONNECTION_STRING: "aKey" as NonEmptyString,

  COSMOSDB_NAME: "aName" as NonEmptyString,
  COSMOSDB_URI: "aUri" as NonEmptyString,
  INTERNAL_USER_ID: "internalUserId" as NonEmptyString,

  RC_CONFIGURATION_CACHE_TTL: 1000 as NonNegativeInteger,
  REDIS_URL: "aRedisUrl" as NonEmptyString,

  REMOTE_CONTENT_COSMOSDB_NAME: "aName" as NonEmptyString,

  REMOTE_CONTENT_COSMOSDB_URI: "aUri" as NonEmptyString,
  SESSION_MANAGER_API_KEY: "apiKey" as NonEmptyString,

  SESSION_MANAGER_BASE_URL: "aBaseUrl" as NonEmptyString,

  isProduction: false,
};
