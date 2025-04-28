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

  BETA_USERS_STORAGE_CONNECTION_STRING:
    "Endpoint=sb://host.docker.internal:30000;SharedAccessKeyName=DefaultFullSharedAccessSignature;SharedAccessKey=foobar" as NonEmptyString,
  BETA_USERS_TABLE_NAME: "nhpartitiontestusers" as NonEmptyString,

  CANARY_USERS_REGEX:
    "^([(0-9)|(a-f)|(A-F)]{63}0)|([(0-9)|(a-f)|(A-F)]{62}[(0-7)]{1}1)$" as NonEmptyString,

  FISCAL_CODE_NOTIFICATION_BLACKLIST: [aBlacklistedFiscalCode],
  NH_PARTITION_FEATURE_FLAG: "all",
  NOTIFICATIONS_QUEUE_NAME: "notification-queue-name" as NonEmptyString,
  NOTIFICATIONS_STORAGE_CONNECTION_STRING:
    "Endpoint=sb://host.docker.internal:30000;SharedAccessKeyName=DefaultFullSharedAccessSignature;SharedAccessKey=foobar" as NonEmptyString,
  NOTIFY_MESSAGE_QUEUE_NAME: "notify-queue-name" as NonEmptyString,
  NOTIFY_VIA_QUEUE_FEATURE_FLAG: "none",
  RETRY_ATTEMPT_NUMBER: "1" as unknown as IntegerFromString,
  isProduction: false,
};
