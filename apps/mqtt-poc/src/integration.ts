import { MqttClient } from "mqtt";
import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { Broker } from "./adapters/broker.js";
import { jsonRequest } from "./adapters/http.js";
import { ConsumerDetails, connectClient } from "./adapters/mqtt.js";
import { apiUrl, loadConfig, stateDir } from "./config.js";

const broker = new Broker();
const services = JSON.parse(
  readFileSync(resolve(stateDir, "services.json"), "utf8"),
) as { apiKey: string; serviceId: string }[];
const clients: MqttClient[] = [];
const results: { name: string; outcome: string }[] = [];
const check = async (name: string, action: () => Promise<void>) => {
  await action();
  results.push({ name, outcome: "passed" });
  console.log(JSON.stringify({ outcome: "passed", test: name }));
};
const registrations: ConsumerDetails[] = [];
const appId = `isolation-${Date.now()}`;
const rejected = async (operation: () => Promise<unknown>) => {
  await assert.rejects(operation);
};
const nextEvent = (
  client: MqttClient,
  event: "close" | "message",
): Promise<void> =>
  new Promise((resolveEvent, reject) => {
    const deadline = setTimeout(
      () => reject(new Error(`MQTT ${event} timeout`)),
      5000,
    );
    if (event === "message")
      client.once("message", () => {
        clearTimeout(deadline);
        resolveEvent();
      });
    else
      client.once("close", () => {
        clearTimeout(deadline);
        resolveEvent();
      });
  });
const deniedOperation = async (
  client: MqttClient,
  action: () => void,
): Promise<void> => {
  client.on("error", () => undefined);
  const denied = new Promise<void>((resolveDenied, reject) => {
    const deadline = setTimeout(
      () =>
        reject(
          new Error("Broker did not explicitly reject unauthorized operation"),
        ),
      5000,
    );
    client.on("packetreceive", (packet) => {
      const negative =
        packet.cmd === "suback"
          ? packet.granted.some(
              (code) => typeof code === "number" && code >= 128,
            )
          : (packet.cmd === "disconnect" || packet.cmd === "puback") &&
            (packet.reasonCode ?? 0) >= 128;
      if (negative) {
        clearTimeout(deadline);
        resolveDenied();
      }
    });
  });
  action();
  await denied;
};

try {
  await check(
    "operator cannot assign one API key to two services",
    async () => {
      await assert.rejects(
        () =>
          jsonRequest(
            `${apiUrl}/admin/services`,
            "POST",
            { apiKey: services[0].apiKey, serviceId: "duplicate-key-service" },
            { "x-admin-key": loadConfig().adminKey },
          ),
        /HTTP 409/,
      );
    },
  );
  await check(
    "invalid API key and forged service identity are rejected",
    async () => {
      await assert.rejects(
        () =>
          jsonRequest(
            `${apiUrl}/subscriptions`,
            "POST",
            { appId: "invalid" },
            { "x-api-key": "invalid" },
          ),
        /HTTP 401/,
      );
      await assert.rejects(
        () =>
          jsonRequest(
            `${apiUrl}/subscriptions`,
            "POST",
            { appId: "spoof", serviceId: "service-B" },
            { "x-api-key": services[0].apiKey },
          ),
        /HTTP 400/,
      );
    },
  );
  for (const service of services) {
    const registration = await jsonRequest<ConsumerDetails>(
      `${apiUrl}/subscriptions`,
      "POST",
      { appId },
      { "x-api-key": service.apiKey },
    );
    const repeated = await jsonRequest<ConsumerDetails>(
      `${apiUrl}/subscriptions`,
      "POST",
      { appId },
      { "x-api-key": service.apiKey },
    );
    assert.deepEqual(registration, repeated);
    registrations.push(registration);
    const client = await connectClient(registration);
    client.on("error", () => undefined);
    await client.subscribeAsync(registration.topic, { qos: 1 });
    clients.push(client);
    const permissions = await broker.request<Record<string, string>>(
      `/permissions/io-mqtt-poc/${registration.username}`,
    );
    const topics = await broker.request<Record<string, string>[]>(
      `/topic-permissions/io-mqtt-poc/${registration.username}`,
    );
    assert.equal(
      new RegExp(permissions.read).test(
        `mqtt-subscription-${registrations[0].clientId}qos1`,
      ),
      registration === registrations[0],
    );
    assert.equal(new RegExp(permissions.write).test("amq.topic"), false);
    assert.equal(topics[0].write, "^$");
  }
  await check(
    "idempotent provisioning and broker resource/topic permissions",
    async () => {
      assert.equal(registrations.length, 3);
    },
  );
  const publisher = await connectClient({
    clientId: "io-publisher-isolation",
    password: loadConfig().publisherPassword,
    username: "publisher",
  });
  clients.push(publisher);
  await check("A B C receive only their own synthetic events", async () => {
    const received = registrations.map(() => new Set<string>());
    clients.slice(0, 3).forEach((client, index) =>
      client.on("message", (topic, payload) => {
        const event = JSON.parse(payload.toString()) as { serviceId: string };
        assert.equal(topic, registrations[index].topic);
        assert.equal(event.serviceId, registrations[index].serviceId);
        received[index].add(event.serviceId);
      }),
    );
    const delivered = clients
      .slice(0, 3)
      .map((client) => nextEvent(client, "message"));
    for (const registration of registrations)
      await publisher.publishAsync(
        registration.topic,
        JSON.stringify({ serviceId: registration.serviceId }),
        { qos: 1 },
      );
    await Promise.all(delivered);
    received.forEach((events, index) =>
      assert.deepEqual([...events], [registrations[index].serviceId]),
    );
  });
  await check(
    "clientId impersonation rejected at CONNECT without displacing victim",
    async () => {
      for (const clean of [false, true])
        await rejected(() =>
          connectClient(
            { ...registrations[0], clientId: registrations[1].clientId },
            { clean },
          ),
        );
      assert.equal(clients[1].connected, true);
      const delivered = nextEvent(clients[1], "message");
      await publisher.publishAsync(
        registrations[1].topic,
        JSON.stringify({ serviceId: registrations[1].serviceId }),
        { qos: 1 },
      );
      await delivered;
      await clients[1].endAsync();
      await rejected(() =>
        connectClient({
          ...registrations[0],
          clientId: registrations[1].clientId,
        }),
      );
      clients[1] = await connectClient(registrations[1]);
    },
  );
  await check("incorrect password and anonymous CONNECT rejected", async () => {
    await rejected(() =>
      connectClient({ ...registrations[0], password: "incorrect" }),
    );
    await rejected(() =>
      connectClient({ clientId: "anonymous", password: "", username: "" }),
    );
  });
  for (const [name, topic, publish] of [
    ["cross-service subscription", registrations[1].topic, false],
    ["global wildcard subscription", "#", false],
    [
      "single-level wildcard subscription",
      "io/v1/services/+/messages/status",
      false,
    ],
    [
      "service-local wildcard subscription",
      "io/v1/services/service-A/#",
      false,
    ],
    ["external PUBLISH", registrations[0].topic, true],
  ] as const) {
    await check(name, async () => {
      const client = await connectClient(registrations[0]);
      clients.push(client);
      await deniedOperation(client, () => {
        if (publish) client.publish(topic, "{}", { qos: 1 }, () => undefined);
        else client.subscribe(topic, { qos: 1 }, () => undefined);
      });
      await client.endAsync(true);
    });
  }
  await check(
    "revocation closes active connection and denies reconnect",
    async () => {
      const client = await connectClient(registrations[2]);
      clients.push(client);
      const closed = nextEvent(client, "close");
      await jsonRequest(
        `${apiUrl}/admin/subscriptions/${registrations[2].username}`,
        "DELETE",
        undefined,
        { "x-admin-key": loadConfig().adminKey },
      );
      await closed;
      await rejected(() => connectClient(registrations[2]));
    },
  );
} finally {
  await Promise.all(clients.map((client) => client.endAsync(true)));
  for (const registration of registrations)
    await jsonRequest(
      `${apiUrl}/admin/subscriptions/${registration.username}`,
      "DELETE",
      undefined,
      { "x-admin-key": loadConfig().adminKey },
    );
  mkdirSync("results", { recursive: true });
  writeFileSync(
    "results/isolation.json",
    JSON.stringify({ at: new Date().toISOString(), results }, null, 2),
  );
}
