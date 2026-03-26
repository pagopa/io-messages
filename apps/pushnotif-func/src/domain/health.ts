import { Database } from "@azure/cosmos";
import { NotificationHubsClient } from "@azure/notification-hubs";
import { BlobService } from "azure-storage";

import { ErrorInternal } from "./error";

export type HealthCheck = () => Promise<ErrorInternal | undefined>;
