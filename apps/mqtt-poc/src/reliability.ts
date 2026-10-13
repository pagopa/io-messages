import { GetMessage } from "amqplib";
import { MqttClient } from "mqtt";
import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";

import { Broker } from "./adapters/broker.js";
import { jsonRequest } from "./adapters/http.js";
import { ConsumerDetails, connectClient } from "./adapters/mqtt.js";
import { apiUrl, loadConfig, stateDir } from "./config.js";
import { syntheticEvent } from "./domain/event.js";
import { openPipeline } from "./publisher.js";

const service = (
  JSON.parse(readFileSync(resolve(stateDir, "services.json"), "utf8")) as {
    apiKey: string;
  }[]
)[0];
const details = await jsonRequest<ConsumerDetails>(
  `${apiUrl}/subscriptions`,
  "POST",
  { appId: `reliability-${Date.now()}` },
  { "x-api-key": service.apiKey },
);
const publisher = await connectClient({
  clientId: "io-publisher-reliability",
  password: loadConfig().publisherPassword,
  username: "publisher",
});
const clients: MqttClient[] = [publisher];
const extraRegistrations: ConsumerDetails[] = [];
const results: { name: string; outcome: string }[] = [];
const received = (
  client: MqttClient,
  count = 1,
  eventId?: string,
): Promise<string[]> =>
  new Promise((resolveMessages, reject) => {
    const messages: string[] = [];
    const listener = (_topic: string, payload: Buffer) => {
      if (
        eventId &&
        (JSON.parse(payload.toString()) as { eventId: string }).eventId !==
          eventId
      )
        return;
      messages.push(payload.toString());
      if (messages.length === count) {
        clearTimeout(deadline);
        client.removeListener("message", listener);
        resolveMessages(messages);
      }
    };
    const deadline = setTimeout(() => {
      client.removeListener("message", listener);
      reject(new Error("Delivery timeout"));
    }, 10000);
    client.on("message", listener);
  });
const record = (name: string) => {
  results.push({ name, outcome: "passed" });
  console.log(JSON.stringify({ outcome: "passed", test: name }));
};
const broker = new Broker();
try {
  let consumer = await connectClient(details);
  clients.push(consumer);
  await consumer.subscribeAsync(details.topic, { qos: 1 });
  await consumer.endAsync();
  const backlog = Array.from({ length: 5 }, (_, index) =>
    syntheticEvent(details.serviceId, index),
  );
  for (const event of backlog)
    await publisher.publishAsync(details.topic, JSON.stringify(event), {
      qos: 1,
    });
  const pending = await broker.request<{ messages: number }>(
    `/queues/io-mqtt-poc/mqtt-subscription-${details.clientId}qos1?disable_stats=true&enable_queue_totals=true`,
  );
  consumer = await connectClient(details);
  clients.push(consumer);
  assert.equal(consumer.connected, true);
  const messages = await received(consumer, 5);
  assert.deepEqual(
    new Set(
      messages.map(
        (message) => (JSON.parse(message) as { eventId: string }).eventId,
      ),
    ),
    new Set(backlog.map((event) => event.eventId)),
  );
  record(
    `offline persistent-session backlog recovered (snapshot=${pending.messages})`,
  );
  const duplicate = syntheticEvent(details.serviceId);
  const duplicates = received(consumer, 2);
  await publisher.publishAsync(details.topic, JSON.stringify(duplicate), {
    qos: 1,
  });
  await publisher.publishAsync(details.topic, JSON.stringify(duplicate), {
    qos: 1,
  });
  const copies = await duplicates;
  assert.equal(
    new Set(
      copies.map(
        (message) => (JSON.parse(message) as { eventId: string }).eventId,
      ),
    ).size,
    1,
  );
  record("duplicate event IDs expose the need for application idempotency");
  consumer.handleMessage = (_packet, callback) => {
    setTimeout(callback, 300);
  };
  const slow = received(consumer);
  await publisher.publishAsync(
    details.topic,
    JSON.stringify(syntheticEvent(details.serviceId)),
    { qos: 1 },
  );
  await slow;
  record("slow consumer delays actual protocol acknowledgement");
  await consumer.endAsync(true);
  const interruptionDetails = await jsonRequest<ConsumerDetails>(
    `${apiUrl}/subscriptions`,
    "POST",
    { appId: `inflight-${Date.now()}` },
    { "x-api-key": service.apiKey },
  );
  extraRegistrations.push(interruptionDetails);
  consumer = await connectClient(interruptionDetails);
  clients.push(consumer);
  await consumer.subscribeAsync(interruptionDetails.topic, { qos: 1 });
  consumer.handleMessage = () => undefined;
  const interruptedEvent = syntheticEvent(details.serviceId);
  const interruptedDelivery = received(consumer, 1, interruptedEvent.eventId);
  await publisher.publishAsync(
    details.topic,
    JSON.stringify(interruptedEvent),
    { qos: 1 },
  );
  await interruptedDelivery;
  await consumer.endAsync(true);
  consumer = await connectClient(interruptionDetails);
  clients.push(consumer);
  const retransmitted = await received(consumer, 1, interruptedEvent.eventId);
  assert.equal(
    (JSON.parse(retransmitted[0]) as { eventId: string }).eventId,
    interruptedEvent.eventId,
  );
  record(
    "connection interrupted before PUBACK recovers the unacknowledged event",
  );
  await consumer.endAsync();
  const expiring = syntheticEvent(details.serviceId);
  await publisher.publishAsync(details.topic, JSON.stringify(expiring), {
    properties: { messageExpiryInterval: 1 },
    qos: 1,
  });
  await delay(2200);
  consumer = await connectClient(details);
  clients.push(consumer);
  const recovered: string[] = [];
  consumer.on("message", (_topic, payload) =>
    recovered.push(payload.toString()),
  );
  const marker = syntheticEvent(details.serviceId);
  const markerReceived = received(consumer, 1, marker.eventId);
  await publisher.publishAsync(details.topic, JSON.stringify(marker), {
    qos: 1,
  });
  await markerReceived;
  const recoveredIds = recovered.map(
    (message) => (JSON.parse(message) as { eventId: string }).eventId,
  );
  assert.ok(recoveredIds.includes(marker.eventId));
  assert.equal(recoveredIds.includes(expiring.eventId), false);
  record("expired offline event absent while live marker delivered");
  await consumer.endAsync();
  consumer = await connectClient(details, {
    properties: { sessionExpiryInterval: 1 },
  });
  clients.push(consumer);
  await consumer.endAsync();
  await delay(2200);
  const bindings = await broker.request<{ destination: string }[]>(
    "/bindings/io-mqtt-poc",
  );
  assert.equal(
    bindings.some(
      (binding) =>
        binding.destination === `mqtt-subscription-${details.clientId}qos1`,
    ),
    false,
  );
  record("session expiry removes the broker session binding");
  const pipeline = await openPipeline();
  try {
    const invalidEvent = {
      ...syntheticEvent(details.serviceId),
      subject: "synthetic invalid field",
    };
    pipeline.channel.publish(
      "io-poc-ingress",
      "event",
      Buffer.from(JSON.stringify(invalidEvent)),
      { persistent: true },
    );
    await pipeline.channel.waitForConfirms();
    let quarantined = false;
    const inspected: GetMessage[] = [];
    const inventory = await pipeline.channel.checkQueue("io-poc-dlq");
    for (
      let attempt = 0;
      attempt < Math.min(10000, inventory.messageCount + 20) && !quarantined;
      attempt++
    ) {
      const message = await pipeline.channel.get("io-poc-dlq", {
        noAck: false,
      });
      if (message) {
        quarantined =
          (JSON.parse(message.content.toString()) as { eventId?: string })
            .eventId === invalidEvent.eventId &&
          message.properties.headers?.["x-death"]?.some(
            (death: { queue: string; reason: string }) =>
              death.queue === "io-poc-ingress" && death.reason === "rejected",
          ) === true;
        inspected.push(message);
      }
      if (!message && !quarantined) await delay(100);
    }
    for (const message of inspected)
      pipeline.channel.nack(message, false, true);
    assert.equal(quarantined, true);
    record(
      "invalid internal payload dead-lettered with broker x-death evidence",
    );
  } finally {
    await pipeline.connection.close();
  }
} finally {
  await Promise.all(clients.map((client) => client.endAsync(true)));
  for (const registration of extraRegistrations)
    await jsonRequest(
      `${apiUrl}/admin/subscriptions/${registration.username}`,
      "DELETE",
      undefined,
      { "x-admin-key": loadConfig().adminKey },
    );
  await jsonRequest(
    `${apiUrl}/admin/subscriptions/${details.username}`,
    "DELETE",
    undefined,
    { "x-admin-key": loadConfig().adminKey },
  );
  mkdirSync("results", { recursive: true });
  writeFileSync(
    "results/reliability.json",
    JSON.stringify({ at: new Date().toISOString(), results }, null, 2),
  );
}
