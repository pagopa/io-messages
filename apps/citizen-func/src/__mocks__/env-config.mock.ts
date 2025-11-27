import { NonNegativeInteger } from "@pagopa/ts-commons/lib/numbers";
import { NonEmptyString, Ulid } from "@pagopa/ts-commons/lib/strings";

import { IConfig } from "../utils/config";

export const envConfig: IConfig = {
  APPLICATIONINSIGHTS_CONNECTION_STRING: "an-appinsights-key" as NonEmptyString,

  COSMOSDB_NAME: "aName" as NonEmptyString,

  COSMOSDB_URI: "aUri" as NonEmptyString,
  FF_BETA_TESTER_LIST: [],

  FF_CANARY_USERS_REGEX: "XYZ" as NonEmptyString,
  FF_TYPE: "none",

  MESSAGE_CONTAINER_NAME: "aaa" as NonEmptyString,

  MESSAGE_CONTENT_STORAGE_CONNECTION_STRING: "aaa" as NonEmptyString,
  IO_COM_STORAGE_CONNECTION_STRING: "aaa" as NonEmptyString,

  PN_SERVICE_ID: "a-pn-service-id" as NonEmptyString,
  REDIS_URL: "aaa" as NonEmptyString,

  REMOTE_CONTENT_COSMOSDB_NAME: "aName" as NonEmptyString,
  REMOTE_CONTENT_COSMOSDB_URI: "aUri" as NonEmptyString,
  SERVICE_CACHE_TTL_DURATION: 10 as NonNegativeInteger,

  SERVICE_TO_RC_CONFIGURATION_MAP: new Map(
    Object.entries({
      aServiceId: "01ARZ3NDEKTSV4RRFFQ69G5FAV" as Ulid,
      two: "01ARZ3NDEKTSV4RRFFQ69G5FAV" as Ulid,
    }),
  ),
  USE_FALLBACK: false,

  isProduction: false,
};
