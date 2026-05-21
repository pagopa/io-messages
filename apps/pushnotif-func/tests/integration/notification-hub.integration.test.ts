import { InvocationContext } from "@azure/functions";
import { NotificationHubsClient } from "@azure/notification-hubs";
import { TelemetryClient as AppInsightsTelemetryClient } from "applicationinsights";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
} from "vitest";

import type { TelemetryService } from "../../src/domain/telemetry";

import getUpdateInstallationHandler from "../../src/adapters/functions/update-installation";
import { NotificationHubInstallationAdapter } from "../../src/adapters/notification-hub/installation";
import { NotificationHubPushNotificationAdapter } from "../../src/adapters/notification-hub/push-notification";
import { handle as handleNotifyQueueMessage } from "../../src/functions/handle-nh-notify-message-call-activity-queue";
import { NotificationHubPartitionFactory } from "../../src/utils/notificationhub-service-partition";
import { NotificationHubsStub } from "../support/notification-hubs-stub";

const partitionRegexes = [/^[0-3]/, /^[4-7]/, /^[8-b]/, /^[c-f]/];
const partitionNames = [
  "nh-partition-1",
  "nh-partition-2",
  "nh-partition-3",
  "nh-partition-4",
];

const createNotificationHubClients = (connectionString: string) =>
  partitionNames.map(
    (hubName) => new NotificationHubsClient(connectionString, hubName),
  );

describe("Notification Hub integration", () => {
  let stub: NotificationHubsStub;

  beforeAll(async () => {
    stub = await NotificationHubsStub.start();
  });

  afterAll(async () => {
    await stub.close();
  });

  beforeEach(() => {
    stub.clearRequests();
  });

  test("sends the notify queue payload to the right Notification Hub partition", async () => {
    const partitionFactory = new NotificationHubPartitionFactory(
      partitionNames.map((name, index) => ({
        endpoint: stub.connectionString(),
        name,
        partitionRegex: partitionRegexes[index].source,
      })),
    );
    const telemetryClient = {
      trackEvent: () => undefined,
    } as unknown as AppInsightsTelemetryClient &
      Pick<AppInsightsTelemetryClient, "trackEvent">;
    const installationId =
      "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

    const result = await handleNotifyQueueMessage(
      Buffer.from(
        JSON.stringify({
          message: {
            installationId,
            kind: "Notify",
            payload: {
              message: "A body",
              message_id: "01J4QX8G17YY5QF8S9S5H7J4RN",
              title: "A title",
            },
          },
          target: "current",
        }),
      ).toString("base64"),
      telemetryClient,
      partitionFactory,
    );

    expect(result).toEqual({ kind: "SUCCESS", skipped: false });
    expect(stub.requests).toHaveLength(1);
    expect(stub.requests[0].method).toBe("POST");
    expect(stub.requests[0].url).toContain("/nh-partition-3/messages/");
    expect(stub.requests[0].headers["servicebusnotification-tags"]).toBe(
      `$InstallationId:{${installationId}} && template`,
    );
    expect(JSON.parse(stub.requests[0].body)).toMatchObject({
      message: "A body",
      message_id: "01J4QX8G17YY5QF8S9S5H7J4RN",
      title: "A title",
    });
  });

  test("updates the installation template through the real Notification Hubs client", async () => {
    const telemetryService: TelemetryService = {
      trackEvent: () => undefined,
      trackException: () => undefined,
    };
    const handler = getUpdateInstallationHandler(
      telemetryService,
      new NotificationHubInstallationAdapter(
        createNotificationHubClients(stub.connectionString()),
        partitionRegexes,
      ),
    );
    const installationId =
      "dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd";

    await expect(
      handler(
        {
          installationId,
          platform: "Apns",
        },
        new InvocationContext(),
      ),
    ).resolves.toBeUndefined();

    expect(stub.requests).toHaveLength(1);
    expect(stub.requests[0].method).toBe("PATCH");
    expect(stub.requests[0].url).toContain(
      `/nh-partition-4/installations/${installationId}`,
    );
    expect(JSON.parse(stub.requests[0].body)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          op: "add",
          path: "/templates/massive/tags",
          value: `["${installationId.substring(0, 3)}"]`,
        }),
        expect.objectContaining({
          op: "add",
          path: "/templates/massive/body",
          value: expect.stringContaining('"aps"'),
        }),
      ]),
    );
  });

  test("schedules, reads, and cancels massive-notification side effects through Notification Hub", async () => {
    const adapter = new NotificationHubPushNotificationAdapter(
      createNotificationHubClients(stub.connectionString()),
      partitionRegexes,
    );

    const scheduled = await adapter.scheduleMassiveNotification(
      "Scheduled title",
      "Scheduled body",
      1_735_689_600,
      ["a-progress", "d-progress"],
    );

    expect(scheduled).toEqual([
      expect.objectContaining({
        notificationID: expect.any(String),
        tags: ["a-progress"],
      }),
      expect.objectContaining({
        notificationID: expect.any(String),
        tags: ["d-progress"],
      }),
    ]);

    const detail = await adapter.getMassiveNotificationDetail(
      scheduled[0].notificationID,
      "a-progress",
    );

    expect(detail).toEqual({
      notificationId: scheduled[0].notificationID,
      state: "Completed",
    });

    await expect(
      adapter.cancelScheduledNotification(
        scheduled[1].notificationID,
        "d-progress",
      ),
    ).resolves.toBe(scheduled[1].notificationID);

    expect(
      stub.requests.filter((request) => request.method === "POST"),
    ).toHaveLength(2);
    expect(
      stub.requests.filter((request) => request.method === "GET"),
    ).toHaveLength(1);
    expect(
      stub.requests.filter((request) => request.method === "DELETE"),
    ).toHaveLength(1);
  });
});
