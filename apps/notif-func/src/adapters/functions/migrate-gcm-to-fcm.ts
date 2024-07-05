import { StorageBlobHandler } from "@azure/functions";
import * as assert from "node:assert/strict";

import { NotificationHubsClientFactory } from "../notification-hubs/index.js";
import { migrateGcmInstallationToFcmV1 } from "../notification-hubs/index.js";

const handler =
  (nhClientFactory: NotificationHubsClientFactory): StorageBlobHandler =>
  async (blob, ctx) => {
    if (!Buffer.isBuffer(blob)) {
      ctx.error("Invalid input");
      return;
    }
    const lines = blob.toString("utf-8").split("\n");
    const installations = lines.map((line) => {
      const [id, , hubName] = line.split(",");
      assert.ok(typeof id !== "undefined");
      assert.ok(typeof hubName !== "undefined");
      return { hubName, id };
    });
    ctx.info(`${installations.length} installations`);
    for (const installation of installations) {
      try {
        const client = nhClientFactory(installation.hubName);
        await migrateGcmInstallationToFcmV1(installation.id, client);
      } catch (err) {
        if (err instanceof Error) {
          const errMessage = `Error during migration: ${err.message}`;
          ctx.error(errMessage);
          throw new Error(errMessage, {
            cause: err,
          });
        }
      }
    }
  };

export default handler;
