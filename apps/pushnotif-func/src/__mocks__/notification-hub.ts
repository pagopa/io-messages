import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";

import { NotificationHubPartitionFactory } from "../utils/notificationhubServicePartition";

export const nhPartitionFactory = new NotificationHubPartitionFactory([
  {
    endpoint:
      "Endpoint=sb://nh-1.servicebus.windows.net/;SharedAccessKeyName=test;SharedAccessKey=test;" as NonEmptyString,
    name: "nh1" as NonEmptyString,
    partitionRegex: new RegExp("^[0-3]"),
  },
  {
    endpoint:
      "Endpoint=sb://nh-2.servicebus.windows.net/;SharedAccessKeyName=test;SharedAccessKey=test;" as NonEmptyString,
    name: "nh2" as NonEmptyString,
    partitionRegex: new RegExp("^[4-7]"),
  },
  {
    endpoint:
      "Endpoint=sb://nh-3.servicebus.windows.net/;SharedAccessKeyName=test;SharedAccessKey=test;" as NonEmptyString,
    name: "nh3" as NonEmptyString,
    partitionRegex: new RegExp("^[8-b]"),
  },
  {
    endpoint:
      "Endpoint=sb://nh-4.servicebus.windows.net/;SharedAccessKeyName=test;SharedAccessKey=test;" as NonEmptyString,
    name: "nh4" as NonEmptyString,
    partitionRegex: new RegExp("^[c-f]"),
  },
]);
