import { InvocationContext, output } from "@azure/functions";
import { describe, expect, test, vi } from "vitest";

import type { TelemetryService } from "../../src/domain/telemetry";

import getInstallationUpdateDispatcher from "../../src/adapters/functions/update-installation-dispatch";

describe("InstallationUpdateDispatcher integration", () => {
  test("emits only stale valid installation updates through the real output binding", async () => {
    const telemetryService: TelemetryService = {
      trackEvent: vi.fn(),
      trackException: vi.fn(),
    };
    const queueOutput = output.storageQueue({
      connection: "AzureWebJobsStorage",
      queueName: "update-installations-dispatch",
    });
    const context = new InvocationContext();
    const handler = getInstallationUpdateDispatcher(
      telemetryService,
      86400,
      queueOutput,
    );

    await handler(
      [
        {
          id: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          nhPartition: "1",
          platform: "apns",
          updatedAt: 10,
        },
        {
          id: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
          nhPartition: "2",
          platform: "fcmv1",
          updatedAt: 90000,
        },
        {
          id: "not-a-sha",
          nhPartition: "3",
          platform: "apns",
          updatedAt: 30,
        },
      ],
      context,
    );

    expect(context.extraOutputs.get(queueOutput)).toEqual([
      {
        installationId:
          "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        platform: "apns",
      },
    ]);
    expect(telemetryService.trackEvent).toHaveBeenCalledTimes(1);
  });
});
