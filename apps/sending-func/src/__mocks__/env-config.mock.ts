import { NonNegativeInteger } from "@pagopa/ts-commons/lib/numbers";
import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";

import { IConfig } from "../utils/config";

export const envConfig: IConfig = {
  APPINSIGHTS_DISABLE: false,
  APPINSIGHTS_SAMPLING_PERCENTAGE: 5,
  APPLICATIONINSIGHTS_CONNECTION_STRING: "aKey" as NonEmptyString,

  BACKEND_BASE_URL: "aBaseUrl" as NonEmptyString,

  BACKEND_TOKEN: "aToken" as NonEmptyString,

  COSMOSDB_NAME: "aName" as NonEmptyString,
  COSMOSDB_URI: "aUri" as NonEmptyString,

  INTERNAL_USER_ID: "internalUserId" as NonEmptyString,
  MESSAGE_CONTAINER_NAME: "aContainerName" as NonEmptyString,
  MESSAGE_CONTENT_STORAGE_CONNECTION_STRING: "aConnString" as NonEmptyString,

  NOTIFICATION_QUEUE_NAME: "aQueueName" as NonEmptyString,
  NOTIFICATION_QUEUE_STORAGE_CONNECTION_STRING: "aConnString" as NonEmptyString,

  RC_CONFIGURATION_CACHE_TTL: 1000 as NonNegativeInteger,
  REDIS_URL: "aRedisUrl" as NonEmptyString,

  REMOTE_CONTENT_COSMOSDB_CON_STRING: "aConnectionString" as NonEmptyString,

  REMOTE_CONTENT_COSMOSDB_NAME: "aName" as NonEmptyString,

  REMOTE_CONTENT_COSMOSDB_URI: "aUri" as NonEmptyString,

  isProduction: false,
};
