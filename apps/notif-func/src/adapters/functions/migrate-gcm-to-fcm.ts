import { StorageQueueHandler } from "@azure/functions";
import { TelemetryClient } from "applicationinsights";
import { z } from "zod";

import {
  NotificationHubsClientFactory,
  migrateGcmInstallationToFcmV1,
} from "../notification-hubs/index.js";

const installationSchema = z.object({
  hubName: z.string().min(1),
  id: z.string().min(1),
});

const handler =
  (
    nhClientFactory: NotificationHubsClientFactory,
    telemetryClient: TelemetryClient,
  ): StorageQueueHandler =>
  async (item, ctx) => {
    try {
      const installation = installationSchema.parse(item);
      const client = nhClientFactory(installation.hubName);
      await migrateGcmInstallationToFcmV1(installation.id, client);
      telemetryClient.context.tags[telemetryClient.context.keys.userId] =
        installation.id;
      telemetryClient.trackEvent({
        name: "io.msgs.installationId.migration.finished",
        properties: {
          hubName: installation.hubName,
        },
      });
    } catch (err) {
      if (err instanceof Error) {
        const errMessage = `Error during migration: ${err.message}`;
        ctx.error(errMessage);
        throw new Error(errMessage, {
          cause: err,
        });
      }
    }
  };

export default handler;
