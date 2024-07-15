import { StorageBlobHandler, StorageQueueOutput } from "@azure/functions";
import { TelemetryClient } from "applicationinsights";
import * as assert from "node:assert/strict";

const handler =
  (
    queueOutput: StorageQueueOutput,
    telemetryClient: TelemetryClient,
  ): StorageBlobHandler =>
  (blob, ctx) => {
    if (!Buffer.isBuffer(blob)) {
      ctx.error("Invalid input");
      return;
    }
    const lines = blob.toString("utf-8").trim().split("\n");

    const installations = lines.map((line) => {
      const [id, , hubName] = line.split(",");
      assert.ok(typeof id !== "undefined");
      assert.ok(typeof hubName !== "undefined");
      return { hubName, id };
    });

    installations.forEach(({ hubName, id }) => {
      telemetryClient.trackEvent({
        name: "io.msgs.installationId.migration.queued",
        properties: {
          hubName,
        },
        tagOverrides: {
          "ai.user.id": id,
        },
      });
    });

    ctx.extraOutputs.set(queueOutput, installations);

    ctx.info(`${installations.length} installations`);
  };

export default handler;
