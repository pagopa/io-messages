import { MqttClient } from "mqtt";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomBytes, randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { monitorEventLoopDelay, performance } from "node:perf_hooks";
import { setTimeout as delay } from "node:timers/promises";
import { parseArgs } from "node:util";
import z from "zod";

import { Broker } from "./adapters/broker.js";
import { jsonRequest } from "./adapters/http.js";
import { ConsumerDetails, connectClient } from "./adapters/mqtt.js";
import { apiUrl, loadConfig } from "./config.js";
import { eventSchema, syntheticEvent } from "./domain/event.js";
import { topicFor } from "./domain/policy.js";

const { values } = parseArgs({
  options: {
    churn: { default: "3", type: "string" },
    connections: { default: "25", type: "string" },
    drain: { default: "10", type: "string" },
    expiry: { default: "900", type: "string" },
    filters: { default: "1", type: "string" },
    maxConnections: { default: "500", type: "string" },
    messages: { default: "300", type: "string" },
    offline: { default: "0.25", type: "string" },
    payload: { default: "0", type: "string" },
    publishers: { default: "1", type: "string" },
    rate: { default: "0", type: "string" },
    repeats: { default: "1", type: "string" },
    scenario: { default: "G", type: "string" },
    session: { default: "3600", type: "string" },
    slow: { default: "0", type: "string" },
    tenants: { default: "3", type: "string" },
    topics: { default: "3", type: "string" },
    warmup: { default: "1", type: "string" },
  },
});
const number = (value: string | undefined, minimum: number, maximum: number) =>
  z.coerce.number().min(minimum).max(maximum).parse(value);
const options = {
  churn: number(values.churn, 1, 100),
  connections: number(values.connections, 0, 10000),
  drain: number(values.drain, 1, 120),
  expiry: number(values.expiry, 1, 3600),
  filters: number(values.filters, 1, 10000),
  maxConnections: number(values.maxConnections, 1, 10000),
  messages: number(values.messages, 0, 1000000),
  offline: number(values.offline, 0, 1),
  payload: number(values.payload, 0, 100000),
  publishers: number(values.publishers, 1, 50),
  rate: number(values.rate, 0, 100000),
  repeats: number(values.repeats, 1, 10),
  scenario: z.enum(["A", "B", "C", "D", "E", "F", "G"]).parse(values.scenario),
  session: number(values.session, 0, 3600),
  slow: number(values.slow, 0, 10000),
  tenants: number(values.tenants, 1, 10000),
  topics: number(values.topics, 1, 10000),
  warmup: number(values.warmup, 0, 60),
};
if (options.connections > options.maxConnections)
  throw new Error(
    "Connection safety ceiling exceeded; explicitly raise --maxConnections after resource review",
  );
if (options.topics < options.tenants)
  throw new Error("Each tenant requires at least one topic");
if (
  options.scenario === "G" &&
  (options.tenants < 2 || options.connections < 2)
)
  throw new Error(
    "Isolation-under-load requires two services and two consumers",
  );
for (const dimension of [
  options.tenants,
  options.topics,
  options.connections,
  options.filters,
  options.messages,
  options.publishers,
  options.payload,
  options.repeats,
  options.churn,
])
  z.number().int().parse(dimension);
const broker = new Broker();
const adminHeaders = { "x-admin-key": loadConfig().adminKey };
const percentile = (sorted: number[], fraction: number) =>
  sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * fraction))] ??
  null;
const nodes = () =>
  broker.request<
    {
      disk_free: number;
      disk_free_alarm: boolean;
      fd_total: number;
      fd_used: number;
      mem_alarm: boolean;
      mem_limit: number;
      mem_used: number;
      rabbitmq_version?: string;
    }[]
  >("/nodes");
const guards = async () => {
  const snapshot = await nodes();
  if (
    snapshot.some(
      (node) =>
        node.mem_alarm ||
        node.disk_free_alarm ||
        node.mem_used > node.mem_limit * 0.85 ||
        node.fd_used > node.fd_total * 0.8,
    )
  )
    throw new Error("Broker resource stop threshold reached");
  return snapshot;
};

for (let repetition = 0; repetition < options.repeats; repetition++) {
  const runId = randomUUID();
  const prefix = `bench-${runId}`;
  const consumers: {
    client: MqttClient;
    details: ConsumerDetails;
    received: Set<string>;
    topics: string[];
  }[] = [];
  const publishers: MqttClient[] = [];
  const tenantKeys: { apiKey: string; serviceId: string }[] = [];
  const published: { at: number; eventId: string; topic: string }[] = [];
  const latencies: number[] = [];
  const connectLatencies: number[] = [];
  const expected = new Set<string>();
  const received = new Set<string>();
  const violations: string[] = [];
  let duplicates = 0;
  let publishErrors = 0;
  let connectionErrors = 0;
  let measurement = false;
  let stopped: null | string = null;
  const timeline: unknown[] = [];
  const baseline = await guards();
  const before = await broker.request<Record<string, unknown>>("/overview");
  const provisionStart = performance.now();
  const loopDelay = monitorEventLoopDelay({ resolution: 20 });
  loopDelay.enable();
  const cpuStart = process.cpuUsage();
  let publishDuration = 0;
  let recoveryMs: null | number = null;
  let snapshotDuring: unknown;
  let queueCountDuring = 0;
  let filtersDuring = 0;
  const attach = (client: MqttClient, details: ConsumerDetails) => {
    client.on("error", () => {
      connectionErrors++;
    });
    if (options.slow)
      client.handleMessage = (_packet, callback) => {
        setTimeout(callback, options.slow);
      };
    client.on("message", (topic, payload) => {
      try {
        const envelope = JSON.parse(payload.toString()) as {
          event: unknown;
          padding: string;
          runId: string;
          sentAt: number;
        };
        const event = eventSchema.parse(envelope.event);
        if (
          event.serviceId !== details.serviceId ||
          !topic.startsWith(`${topicFor(details.serviceId)}/bench/`)
        ) {
          violations.push("Cross-service delivery");
          return;
        }
        if (!measurement || envelope.runId !== runId) return;
        const key = `${details.clientId}:${event.eventId}`;
        if (received.has(key)) duplicates++;
        else {
          received.add(key);
          latencies.push(performance.now() - envelope.sentAt);
        }
      } catch {
        violations.push("Invalid benchmark envelope");
      }
    });
  };
  try {
    for (let tenant = 0; tenant < options.tenants; tenant++) {
      const credentials = {
        apiKey: randomBytes(32).toString("hex"),
        serviceId: `${prefix}-${tenant}`,
      };
      await jsonRequest(
        `${apiUrl}/admin/services`,
        "POST",
        credentials,
        adminHeaders,
      );
      tenantKeys.push(credentials);
    }
    const topics = Array.from(
      { length: options.topics },
      (_, index) =>
        `${topicFor(tenantKeys[index % options.tenants].serviceId)}/bench/${index}`,
    );
    for (let index = 0; index < options.connections; index++) {
      const tenant = tenantKeys[index % options.tenants];
      const details = await jsonRequest<ConsumerDetails>(
        `${apiUrl}/subscriptions`,
        "POST",
        { appId: `consumer-${index}` },
        { "x-api-key": tenant.apiKey },
      );
      const started = performance.now();
      const client = await connectClient(details, {
        clean: options.session === 0,
        properties: {
          receiveMaximum: 20,
          sessionExpiryInterval: options.session,
        },
      });
      connectLatencies.push(performance.now() - started);
      attach(client, details);
      const filters = topics
        .filter((topic) => topic.startsWith(`${topicFor(details.serviceId)}/`))
        .slice(0, options.filters);
      await client.subscribeAsync(filters, { qos: 1 });
      consumers.push({ client, details, received: new Set(), topics: filters });
      filtersDuring += filters.length;
      if (index % 25 === 0) await guards();
    }
    const provisionMs = performance.now() - provisionStart;
    for (let index = 0; index < options.publishers; index++)
      publishers.push(
        await connectClient({
          clientId: `io-publisher-${runId}-${index}`,
          password: loadConfig().publisherPassword,
          username: "publisher",
        }),
      );
    await delay(options.warmup * 1000);
    const offlineCount =
      options.scenario === "E"
        ? Math.floor(consumers.length * options.offline)
        : 0;
    for (const consumer of consumers.slice(0, offlineCount))
      await consumer.client.endAsync();
    const bindings = await broker.request<{ destination: string }[]>(
      "/bindings/io-mqtt-poc",
    );
    const sessionQueues = await broker.request<
      {
        messages: number;
        messages_ready: number;
        messages_unacknowledged: number;
        name: string;
      }[]
    >("/queues/io-mqtt-poc?disable_stats=true&enable_queue_totals=true");
    queueCountDuring = sessionQueues.filter((queue) =>
      consumers.some(
        (consumer) =>
          queue.name === `mqtt-subscription-${consumer.details.clientId}qos1`,
      ),
    ).length;
    measurement = true;
    const start = performance.now();
    let next = 0;
    const isolationProbe =
      options.scenario === "G"
        ? assert.rejects(() =>
            consumers[0].client.subscribeAsync(consumers[1].topics[0], {
              qos: 1,
            }),
          )
        : Promise.resolve();
    await Promise.all([
      isolationProbe,
      ...publishers.map(async (publisher) => {
        while (next < options.messages) {
          const index = next++;
          const topic = topics[index % topics.length];
          const serviceId =
            tenantKeys[(index % topics.length) % tenantKeys.length].serviceId;
          const event = syntheticEvent(serviceId, index);
          const sentAt = performance.now();
          if (options.rate)
            await delay(
              Math.max(
                0,
                start + (index * 1000) / options.rate - performance.now(),
              ),
            );
          if (violations.length) throw new Error("Isolation violation");
          if (index % 100 === 0) {
            const snapshot = await guards();
            timeline.push({ at: performance.now() - start, snapshot });
          }
          try {
            const acknowledgement = await publisher.publishAsync(
              topic,
              JSON.stringify({
                event,
                padding: "x".repeat(options.payload),
                runId,
                sentAt,
              }),
              {
                properties: { messageExpiryInterval: options.expiry },
                qos: 1,
                retain: false,
              },
            );
            if (
              acknowledgement &&
              "reasonCode" in acknowledgement &&
              typeof acknowledgement.reasonCode === "number" &&
              acknowledgement.reasonCode >= 128
            )
              throw new Error("Publish refused");
            published.push({ at: sentAt, eventId: event.eventId, topic });
            consumers.forEach((consumer, consumerIndex) => {
              if (
                consumer.topics.includes(topic) &&
                (consumerIndex >= offlineCount || options.session > 0)
              )
                expected.add(`${consumer.details.clientId}:${event.eventId}`);
            });
          } catch {
            publishErrors++;
          }
        }
      }),
    ]);
    publishDuration = performance.now() - start;
    const deliveredDuringPublish = received.size;
    snapshotDuring = await broker.request(
      "/queues/io-mqtt-poc?disable_stats=true&enable_queue_totals=true",
    );
    const recoveryStart = performance.now();
    for (const consumer of consumers.slice(0, offlineCount)) {
      consumer.client = await connectClient(consumer.details, {
        clean: options.session === 0,
        properties: { sessionExpiryInterval: options.session },
      });
      attach(consumer.client, consumer.details);
      if (options.session === 0)
        await consumer.client.subscribeAsync(consumer.topics, { qos: 1 });
    }
    const churnStart = performance.now();
    if (options.scenario === "F") {
      for (let round = 0; round < options.churn; round++) {
        for (const consumer of consumers) {
          await consumer.client.endAsync();
          consumer.client = await connectClient(consumer.details, {
            clean: options.session === 0,
            properties: { sessionExpiryInterval: options.session },
          });
          attach(consumer.client, consumer.details);
          if (options.session === 0)
            await consumer.client.subscribeAsync(consumer.topics, { qos: 1 });
        }
      }
    }
    const churnMs =
      options.scenario === "F" ? performance.now() - churnStart : null;
    while (
      received.size < expected.size &&
      performance.now() - recoveryStart < options.drain * 1000
    )
      await delay(50);
    if (offlineCount) recoveryMs = performance.now() - recoveryStart;
    latencies.sort((left, right) => left - right);
    connectLatencies.sort((left, right) => left - right);
    if (violations.length) throw new Error("Tenant isolation failed");
    const environment = await broker.request("/overview");
    const runtime = execFileSync(
      "docker",
      [
        "stats",
        "--no-stream",
        "--format",
        "{{json .}}",
        "io-com-rabbitmq-mqtt-1",
        "io-com-mqtt-onboarding-1",
      ],
      { encoding: "utf8" },
    )
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line));
    const cpu = process.cpuUsage(cpuStart);
    const result = {
      at: new Date().toISOString(),
      brokerAfter: await guards(),
      brokerBefore: baseline,
      churnMs,
      connectMs: {
        p50: percentile(connectLatencies, 0.5),
        p95: percentile(connectLatencies, 0.95),
      },
      connectionErrors,
      deliveryRateDuringPublishWindow:
        deliveredDuringPublish / (publishDuration / 1000),
      duplicates,
      environment,
      expectedDeliveries: expected.size,
      generator: {
        cpuSystemMicros: cpu.system,
        cpuUserMicros: cpu.user,
        eventLoopP99Ms: loopDelay.percentile(99) / 1e6,
        rssBytes: process.memoryUsage().rss,
      },
      isolationViolations: violations.length,
      latencyMs: {
        p50: percentile(latencies, 0.5),
        p95: percentile(latencies, 0.95),
        p99: percentile(latencies, 0.99),
      },
      limitation:
        "Closed-loop local benchmark; generator and Docker VM share host resources. Benchmark envelopes are not the public event contract. Pending and expired deliveries require queue/DLQ reconciliation.",
      options,
      outcome: "measured",
      overviewBefore: before,
      pendingOrExpired: [...expected].filter((key) => !received.has(key))
        .length,
      provisionMs,
      publishErrors,
      publishMs: publishDuration,
      publishRate: published.length / (publishDuration / 1000),
      published: published.length,
      recoveryMs,
      repetition,
      runId,
      runtime,
      snapshotDuring,
      timeline,
      topology: {
        acceptedSubscriptions: filtersDuring,
        concurrentConnections: consumers.length + publishers.length,
        distinctTopics: options.topics,
        observedBindings: bindings.filter((binding) =>
          consumers.some((consumer) =>
            binding.destination.includes(consumer.details.clientId),
          ),
        ).length,
        observedSessionQueues: queueCountDuring,
        persistentSessions: options.session > 0 ? consumers.length : 0,
      },
      uniqueDeliveries: received.size,
    };
    mkdirSync("results", { recursive: true });
    writeFileSync(
      `results/${options.scenario}-${runId}.json`,
      JSON.stringify(result, null, 2),
    );
    console.log(
      JSON.stringify({
        file: `results/${options.scenario}-${runId}.json`,
        filters: filtersDuring,
        latencyMs: result.latencyMs,
        pending: result.pendingOrExpired,
        published: result.published,
        queues: queueCountDuring,
        received: result.uniqueDeliveries,
        scenario: options.scenario,
      }),
    );
  } catch (error) {
    stopped = error instanceof Error ? error.message : "Benchmark failed";
    mkdirSync("results", { recursive: true });
    writeFileSync(
      `results/${options.scenario}-${runId}-failed.json`,
      JSON.stringify(
        {
          options,
          published: published.length,
          received: received.size,
          runId,
          stopped,
          violations,
        },
        null,
        2,
      ),
    );
    throw error;
  } finally {
    loopDelay.disable();
    await Promise.all(
      [...consumers.map((consumer) => consumer.client), ...publishers].map(
        (client) => client.endAsync(true),
      ),
    );
    for (const consumer of consumers)
      await jsonRequest(
        `${apiUrl}/admin/subscriptions/${consumer.details.username}`,
        "DELETE",
        undefined,
        adminHeaders,
      );
    for (const tenant of tenantKeys)
      await jsonRequest(
        `${apiUrl}/admin/services/${tenant.serviceId}`,
        "DELETE",
        undefined,
        adminHeaders,
      );
  }
}
