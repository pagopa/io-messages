import { setTimeout as sleep } from "node:timers/promises";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
} from "vitest";

import { createQueueClient } from "../support/azurite";
import { FunctionHost, createPushnotifHostEnv } from "../support/function-host";
import { NotificationHubsStub } from "../support/notification-hubs-stub";

const notifyMessagesQueueName = "notify-messages";
const updateInstallationQueueName = "update-installations-dispatch";
const updateInstallationPoisonQueueName =
  "update-installations-dispatch-poison";

const enableFunctions = (...functionNames: string[]) =>
  Object.fromEntries(
    functionNames.map((functionName) => [
      `AzureWebJobs.${functionName}.Disabled`,
      "false",
    ]),
  );

const waitFor = async (
  predicate: () => Promise<boolean> | boolean,
  message: string,
): Promise<void> => {
  for (let attempt = 0; attempt < 40; attempt++) {
    if (await predicate()) {
      return;
    }

    await sleep(250);
  }

  throw new Error(message);
};

describe.sequential("Notification Hub host integration", () => {
  let host: FunctionHost;
  let notifyMessagesQueue: ReturnType<typeof createQueueClient>;
  let stub: NotificationHubsStub;
  let updateInstallationPoisonQueue: ReturnType<typeof createQueueClient>;
  let updateInstallationQueue: ReturnType<typeof createQueueClient>;

  beforeAll(async () => {
    stub = await NotificationHubsStub.start();
    notifyMessagesQueue = createQueueClient(notifyMessagesQueueName);
    updateInstallationPoisonQueue = createQueueClient(
      updateInstallationPoisonQueueName,
    );
    updateInstallationQueue = createQueueClient(updateInstallationQueueName);

    await notifyMessagesQueue.createIfNotExists();
    await updateInstallationPoisonQueue.createIfNotExists();
    await updateInstallationQueue.createIfNotExists();

    host = new FunctionHost(
      "/workspace/apps/pushnotif-func",
      createPushnotifHostEnv({
        NH1_ENDPOINT: stub.connectionString(),
        NH2_ENDPOINT: stub.connectionString(),
        NH3_ENDPOINT: stub.connectionString(),
        NH4_ENDPOINT: stub.connectionString(),
        ...enableFunctions(
          "HandleNHNotifyMessageCallActivityQueue",
          "UpdateInstallation",
        ),
      }),
    );

    await host.start();
  });

  afterAll(async () => {
    await host.stop();
    await stub.close();
  });

  beforeEach(async () => {
    stub.clearRequests();
    await notifyMessagesQueue.clearMessages();
    await updateInstallationPoisonQueue.clearMessages();
    await updateInstallationQueue.clearMessages();
  });

  test("consumes a real queue message and sends it to Notification Hub through the host", async () => {
    const installationId =
      "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

    await notifyMessagesQueue.sendMessage(
      Buffer.from(
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
      ).toString("base64"),
    );

    await waitFor(
      () => stub.requests.length === 1,
      `The Functions host did not forward the notification to Notification Hubs.\n${host.collectedLogs}`,
    );

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

  test("consumes a real queue message and updates the Notification Hub installation through the host", async () => {
    const installationId =
      "dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd";

    await updateInstallationQueue.sendMessage(
      Buffer.from(
        JSON.stringify({
          installationId,
          platform: "Apns",
        }),
      ).toString("base64"),
    );

    await waitFor(
      () => stub.requests.length === 1,
      `The Functions host did not patch the Notification Hub installation.\n${host.collectedLogs}`,
    );

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

  test("accepts fcmv1 queue payloads and emits the expected installation patch", async () => {
    const installationId =
      "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff";

    await updateInstallationQueue.sendMessage(
      Buffer.from(
        JSON.stringify({
          installationId,
          platform: "FcmV1",
        }),
      ).toString("base64"),
    );

    await waitFor(
      () => stub.requests.length === 1,
      `The Functions host did not consume the installation-update queue message.\n${host.collectedLogs}`,
    );

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
          value: expect.stringContaining('"android"'),
        }),
      ]),
    );
  });
});
