import { IntegerFromString } from "@pagopa/ts-commons/lib/numbers";
import { FiscalCode, NonEmptyString } from "@pagopa/ts-commons/lib/strings";

import { IConfig } from "../utils/config";

const aBlacklistedFiscalCode = "AAAAAA00A00H501I" as FiscalCode;

export const envConfig: IConfig = {
  APPINSIGHTS_INSTRUMENTATIONKEY: "Idontknow" as NonEmptyString,
  APPINSIGHTS_SAMPLING_PERCENTAGE: "20" as unknown as IntegerFromString,

  AZURE_NH_ENDPOINT:
    "Endpoint=sb://host.docker.internal:30000;SharedAccessKeyName=DefaultFullSharedAccessSignature;SharedAccessKey=foobar" as NonEmptyString,
  AZURE_NH_HUB_NAME: "partition-legacy" as NonEmptyString,

  AZURE_NOTIFICATION_HUB_PARTITIONS: [
    {
      endpoint: "endpoint-partition-1" as NonEmptyString,
      name: "partition-1" as NonEmptyString,
      partitionRegex: /^[0-3]/,
    },
    {
      endpoint: "endpoint-partition-2" as NonEmptyString,
      name: "partition-2" as NonEmptyString,
      partitionRegex: /^[4-7]/,
    },
    {
      endpoint: "endpoint-partition-3" as NonEmptyString,
      name: "partition-3" as NonEmptyString,
      partitionRegex: /^[8-b]/,
    },
    {
      endpoint: "endpoint-partition-4" as NonEmptyString,
      name: "partition-4" as NonEmptyString,
      partitionRegex: /^[c-f]/,
    },
  ],
  COSMOSDB_NAME: "CosmosDBName" as NonEmptyString,
  COSMOSDB_URI: "CosmosDBUri" as NonEmptyString,
  FISCAL_CODE_NOTIFICATION_BLACKLIST: [aBlacklistedFiscalCode],
  MESSAGE_CONTAINER_NAME: "MessageContainerNane" as NonEmptyString,
  MESSAGE_CONTENT_STORAGE_CONNECTION_STRING:
    "MessageContentStorageConnectionString" as NonEmptyString,
  NH_PARTITION_FEATURE_FLAG: "all",

  NOTIFICATIONS_QUEUE_NAME: "notification-queue-name" as NonEmptyString,

  NOTIFICATIONS_STORAGE_CONNECTION_STRING:
    "Endpoint=sb://host.docker.internal:30000;SharedAccessKeyName=DefaultFullSharedAccessSignature;SharedAccessKey=foobar" as NonEmptyString,

  NOTIFY_MESSAGE_QUEUE_NAME: "notify-queue-name" as NonEmptyString,
  REMOTE_CONTENT_COSMOSDB_NAME: "RemoteContentCosmosDBName" as NonEmptyString,
  REMOTE_CONTENT_COSMOSDB_URI: "RemoteContentCosmosDBUri" as NonEmptyString,
  RETRY_ATTEMPT_NUMBER: "1" as unknown as IntegerFromString,
  SESSION_MANAGER_API_KEY: "SessionManagerAPIKey" as NonEmptyString,
  SESSION_MANAGER_BASE_URL: "SessionManageBaseUrl" as NonEmptyString,
  isProduction: false,
};
