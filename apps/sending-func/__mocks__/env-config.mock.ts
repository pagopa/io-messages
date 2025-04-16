import { NonNegativeInteger } from "@pagopa/ts-commons/lib/numbers";
import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";

import { IConfig } from "../utils/config";

export const envConfig: IConfig = {
  APPLICATIONINSIGHTS_CONNECTION_STRING: "aKey" as NonEmptyString,

  BACKEND_BASE_URL: "aBaseUrl" as NonEmptyString,

  BACKEND_TOKEN: "aToken" as NonEmptyString,
  COSMOSDB_NAME: "aName" as NonEmptyString,

  COSMOSDB_URI: "aUri" as NonEmptyString,
  FF_BETA_TESTERS: [],

  FF_CANARY_USERS_REGEX: "XYZ" as NonEmptyString,

  FF_TYPE: "none",
  INTERNAL_USER_ID: "internalUserId" as NonEmptyString,
  MESSAGE_CONFIGURATION_CHANGE_FEED_START_TIME: 0 as NonNegativeInteger,
  MESSAGE_CONTAINER_NAME: "aContainerName" as NonEmptyString,

  MESSAGE_CONTENT_STORAGE_CONNECTION_STRING: "aConnString" as NonEmptyString,
  NODE_ENV: "production",

  NOTIFICATION_QUEUE_NAME: "aQueueName" as NonEmptyString,
  NOTIFICATION_QUEUE_STORAGE_CONNECTION_STRING: "aConnString" as NonEmptyString,

  RC_CONFIGURATION_CACHE_TTL: 1000 as NonNegativeInteger,
  REDIS_URL: "aRedisUrl" as NonEmptyString,

  REMOTE_CONTENT_COSMOSDB_NAME: "aName" as NonEmptyString,

  REMOTE_CONTENT_COSMOSDB_URI: "aUri" as NonEmptyString,
  REQ_SERVICE_ID: undefined,

  USE_FALLBACK: false,
  isProduction: false,
};
