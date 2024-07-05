import { StorageBlobFunctionOptions } from "@azure/functions";

import { NotificationHubsClientFactory } from "../notification-hubs/index.js";

export type Options = Pick<StorageBlobFunctionOptions, "connection" | "path">;

const migrateGcmToFcmV1 = (
  opts: Options,
  getNotificationHubsClient: NotificationHubsClientFactory,
): StorageBlobFunctionOptions => ({
  handler: () => {},
  ...opts,
});

export default migrateGcmToFcmV1;
