import { MqttClient } from "mqtt";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomBytes, randomUUID } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, resolve } from "node:path";
import { monitorEventLoopDelay, performance } from "node:perf_hooks";
import { setTimeout as delay } from "node:timers/promises";
import { isDeepStrictEqual, parseArgs } from "node:util";
import { ulid } from "ulid";
import z from "zod";

import { Broker } from "./adapters/broker.js";
import { jsonRequest } from "./adapters/http.js";
import { ConsumerDetails, connectClient } from "./adapters/mqtt.js";
import { apiUrl, loadConfig } from "./config.js";
import {
  MessageEvent,
  eventSchema,
  syntheticCreateSequence,
} from "./domain/event.js";
import { identifierSchema, topicFor } from "./domain/policy.js";
import { openPipeline } from "./publisher.js";

const { values } = parseArgs({
  options: {
    "batch-size": { default: "25", type: "string" },
    "cleanup-run": { type: "string" },
    "creates-per-service": { default: "3", type: "string" },
    drain: { default: "45", type: "string" },
    "max-connections": { default: "1000", type: "string" },
    "online-window": { default: "250", type: "string" },
    services: { default: "1000", type: "string" },
  },
});
const options = {
  batchSize: z.coerce
    .number()
    .int()
    .min(1)
    .max(100)
    .parse(values["batch-size"]),
  createsPerService: z.coerce
    .number()
    .int()
    .min(1)
    .max(100)
    .parse(values["creates-per-service"]),
  drainSeconds: z.coerce.number().int().min(1).max(120).parse(values.drain),
  maxConnections: z.coerce
    .number()
    .int()
    .min(2)
    .max(10000)
    .parse(values["max-connections"]),
  onlineWindow: z.coerce
    .number()
    .int()
    .min(1)
    .max(10000)
    .parse(values["online-window"]),
  services: z.coerce.number().int().min(2).max(10000).parse(values.services),
};
assert.ok(
  Math.min(options.services, options.onlineWindow) <= options.maxConnections,
  "Explicit connection ceiling exceeded",
);
const windowed = options.onlineWindow < options.services;
const broker = new Broker();
const adminHeaders = { "x-admin-key": loadConfig().adminKey };
const runId = randomUUID();
const startedAt = new Date().toISOString();
const loopDelay = monitorEventLoopDelay({ resolution: 20 });
const cpuStart = process.cpuUsage();
const services: {
  client?: MqttClient;
  connectMs: number;
  creates: {
    events: MessageEvent[];
    messageId: string;
    receivedVersions: Set<number>;
  }[];
  details?: ConsumerDetails;
  onboardMs: number;
  onlineExpected: boolean;
  receivedEvents: Set<string>;
  serviceId: string;
  topic: string;
}[] = [];
const pending = new Map<string, { event: MessageEvent; sentAt: number }>();
const latencies: number[] = [];
const snapshots: unknown[] = [];
const cleanupErrors: { operation: string; serviceId: string }[] = [];
const violations: { reason: string; recipientServiceId: string }[] = [];
let duplicates = 0;
let connectionErrors = 0;
let publishErrors = 0;
let confirmedIngress = 0;
let negativeProbes = 0;
let peakConsumerConnections = 0;
let observedPeakConsumerConnections = 0;
let topology: Record<string, number> = {};
let brokerBefore: unknown;
let brokerAfter: unknown;
let environment: unknown;
let runtime: unknown;
let provisionMs = 0;
let publicationMs = 0;
let deliveryWindowMs = 0;
let failure: string | undefined;
let closing = false;
let pipeline: Awaited<ReturnType<typeof openPipeline>> | undefined;

const guard = async () => {
  const nodes = await broker.request<
    {
      disk_free_alarm: boolean;
      fd_total: number;
      fd_used: number;
      mem_alarm: boolean;
      mem_limit: number;
      mem_used: number;
    }[]
  >("/nodes");
  assert.ok(
    nodes.every(
      (node) =>
        !node.mem_alarm &&
        !node.disk_free_alarm &&
        node.mem_used < node.mem_limit * 0.85 &&
        node.fd_used < node.fd_total * 0.8,
    ),
    "Broker resource safety threshold reached",
  );
  assert.equal(
    violations.length,
    0,
    "Tenant isolation or payload integrity violation",
  );
  assert.equal(connectionErrors, 0, "MQTT or ingress connection failed");
  assert.equal(publishErrors, 0, "Ingress channel failed");
  return nodes;
};
const deniedSubscription = async (client: MqttClient, topic: string) => {
  let negativeReason = false;
  const capture = (packet: { cmd: string; granted?: unknown[] }) => {
    if (
      packet.cmd === "suback" &&
      packet.granted?.some((code) => typeof code === "number" && code >= 128)
    )
      negativeReason = true;
  };
  client.on("packetreceive", capture);
  try {
    await assert.rejects(() => client.subscribeAsync(topic, { qos: 1 }));
    assert.equal(negativeReason, true, "Expected an explicit negative SUBACK");
    negativeProbes++;
  } finally {
    client.removeListener("packetreceive", capture);
  }
};

const receive = (
  service: (typeof services)[number],
  topic: string,
  payload: Buffer,
) => {
  const parsed = (() => {
    try {
      return eventSchema.safeParse(JSON.parse(payload.toString()));
    } catch {
      return undefined;
    }
  })();
  if (
    !parsed?.success ||
    topic !== service.topic ||
    parsed.data.serviceId !== service.serviceId
  ) {
    violations.push({
      reason: "Wrong service/topic or invalid public schema",
      recipientServiceId: service.serviceId,
    });
    return;
  }
  const expected = pending.get(parsed.data.eventId);
  const create = service.creates.find(
    (entry) => entry.messageId === parsed.data.messageId,
  );
  if (!expected || !create || !isDeepStrictEqual(parsed.data, expected.event)) {
    violations.push({
      reason: "Unexpected message/event or changed payload",
      recipientServiceId: service.serviceId,
    });
    return;
  }
  if (service.receivedEvents.has(parsed.data.eventId)) duplicates++;
  else {
    service.receivedEvents.add(parsed.data.eventId);
    create.receivedVersions.add(parsed.data.version);
    latencies.push(performance.now() - expected.sentAt);
  }
};
const openConsumer = async (service: (typeof services)[number]) => {
  assert.ok(service.details);
  service.onlineExpected = true;
  const client = await connectClient(service.details, {
    customHandleAcks: (topic, payload, _packet, acknowledge) => {
      receive(service, topic, payload);
      acknowledge(0);
    },
  });
  service.client = client;
  client.on("error", () => {
    if (!closing) connectionErrors++;
  });
  client.on("close", () => {
    if (!closing && service.onlineExpected) connectionErrors++;
  });
  peakConsumerConnections = Math.max(
    peakConsumerConnections,
    services.filter((entry) => entry.client?.connected).length,
  );
  assert.ok(peakConsumerConnections <= options.maxConnections);
  return client;
};
const closeConsumer = async (service: (typeof services)[number]) => {
  service.onlineExpected = false;
  await service.client?.endAsync();
};

if (values["cleanup-run"]) {
  const manifest = z
    .object({
      runId: z.uuid(),
      scenario: z.literal("H"),
      services: z.array(z.object({ serviceId: identifierSchema })),
    })
    .parse(
      JSON.parse(
        readFileSync(
          resolve("results", basename(values["cleanup-run"])),
          "utf8",
        ),
      ),
    );
  const remaining: string[] = [];
  for (
    let offset = 0;
    offset < manifest.services.length;
    offset += options.batchSize
  ) {
    await Promise.all(
      manifest.services
        .slice(offset, offset + options.batchSize)
        .map(async (service) => {
          try {
            await jsonRequest(
              `${apiUrl}/admin/services/${service.serviceId}`,
              "DELETE",
              undefined,
              adminHeaders,
            );
          } catch {
            remaining.push(service.serviceId);
          }
        }),
    );
  }
  const recovery = {
    at: new Date().toISOString(),
    attemptedServices: manifest.services.length,
    outcome: remaining.length ? "failed" : "passed",
    remainingServices: remaining,
    runId: manifest.runId,
    scenario: "H-cleanup",
  };
  writeFileSync(
    `results/H-${manifest.runId}-cleanup.json`,
    JSON.stringify(recovery, null, 2),
  );
  process.stdout.write(
    JSON.stringify({
      attempted: manifest.services.length,
      outcome: recovery.outcome,
      phase: "cleanup-recovery",
      remaining: remaining.length,
    }) + "\n",
  );
  if (remaining.length) process.exitCode = 1;
} else {
  loopDelay.enable();
  try {
    brokerBefore = await guard();
    environment = await broker.request("/overview");
    pipeline = await openPipeline();
    pipeline.connection.on("error", () => {
      if (!closing) connectionErrors++;
    });
    pipeline.channel.on("error", () => {
      if (!closing) publishErrors++;
    });
    const ingress = await pipeline.channel.checkQueue("io-poc-ingress");
    assert.ok(
      ingress.consumerCount > 0,
      "The internal publisher worker must be running",
    );
    const provisionStarted = performance.now();
    for (
      let offset = 0;
      offset < options.services;
      offset += options.batchSize
    ) {
      const batch = Array.from(
        { length: Math.min(options.batchSize, options.services - offset) },
        () => ({
          apiKey: randomBytes(32).toString("hex"),
          serviceId: ulid(),
        }),
      );
      const settled = await Promise.allSettled(
        batch.map(async (credentials) => {
          const service: (typeof services)[number] = {
            connectMs: 0,
            creates: [],
            onboardMs: 0,
            onlineExpected: false,
            receivedEvents: new Set(),
            serviceId: credentials.serviceId,
            topic: topicFor(credentials.serviceId),
          };
          services.push(service);
          const begin = performance.now();
          await jsonRequest(
            `${apiUrl}/admin/services`,
            "POST",
            credentials,
            adminHeaders,
          );
          const details = await jsonRequest<ConsumerDetails>(
            `${apiUrl}/subscriptions`,
            "POST",
            { appId: "status-events" },
            { "x-api-key": credentials.apiKey },
          );
          service.details = details;
          service.onboardMs = performance.now() - begin;
          assert.equal(details.serviceId, credentials.serviceId);
          assert.equal(details.topic, service.topic);
          const connectStarted = performance.now();
          const client = await openConsumer(service);
          service.client = client;
          service.connectMs = performance.now() - connectStarted;
          const granted = await client.subscribeAsync(service.topic, {
            qos: 1,
          });
          assert.equal(granted.length, 1);
          assert.equal(granted[0].qos, 1);
          if (windowed) await closeConsumer(service);
        }),
      );
      assert.ok(
        settled.every((result) => result.status === "fulfilled"),
        "A service failed onboarding, CONNECT or SUBSCRIBE",
      );
      snapshots.push({
        nodes: await guard(),
        phase: "onboarding",
        services: services.length,
      });
      process.stdout.write(
        JSON.stringify({
          phase: "onboarding",
          scenario: "H",
          services: services.length,
          target: options.services,
        }) + "\n",
      );
    }
    provisionMs = performance.now() - provisionStarted;
    const queues = await broker.request<{ name: string }[]>(
      "/queues/io-mqtt-poc?disable_stats=true",
    );
    const bindings = await broker.request<
      { destination: string; routing_key: string; source: string }[]
    >("/bindings/io-mqtt-poc");
    const usernames = new Set(
      services.map((service) => service.details?.username),
    );
    let connections = await broker.request<{ user: string }[]>("/connections");
    const inventoryStarted = performance.now();
    while (
      !windowed &&
      connections.filter((connection) => usernames.has(connection.user))
        .length < options.services &&
      performance.now() - inventoryStarted < 15000
    ) {
      assert.ok(
        services.every((service) => service.client?.connected),
        "A consumer disconnected before the inventory snapshot",
      );
      await delay(250);
      connections = await broker.request<{ user: string }[]>("/connections");
    }
    const sessionQueues = new Set(
      services.map(
        (service) => `mqtt-subscription-${service.details?.clientId}qos1`,
      ),
    );
    const ownQueues = queues.filter((queue) => sessionQueues.has(queue.name));
    const ownBindings = bindings.filter(
      (binding) =>
        sessionQueues.has(binding.destination) &&
        binding.source === "amq.topic",
    );
    for (const service of services) {
      const matches = ownBindings.filter(
        (binding) =>
          binding.destination ===
          `mqtt-subscription-${service.details?.clientId}qos1`,
      );
      assert.equal(matches.length, 1);
      assert.equal(matches[0].routing_key, service.topic.replaceAll("/", "."));
    }
    topology = {
      acceptedSubscriptions: services.length,
      distinctTopics: new Set(services.map((service) => service.topic)).size,
      observedSessionQueues: ownQueues.length,
      observedTopicBindings: ownBindings.length,
      onboardedServices: services.length,
      persistentSessions: services.length,
    };
    assert.ok(
      Object.values(topology).every((count) => count === options.services),
      "Broker inventory does not match one service/topic/session/consumer",
    );
    observedPeakConsumerConnections = connections.filter((connection) =>
      usernames.has(connection.user),
    ).length;
    const first = windowed
      ? await openConsumer(services[0])
      : services[0].client;
    assert.ok(first);
    await deniedSubscription(first, services[1].topic);
    await deniedSubscription(first, "io/v1/services/+/messages/status");
    if (windowed) await closeConsumer(services[0]);
    const publicationStarted = performance.now();
    for (const service of services) {
      service.creates = Array.from(
        { length: options.createsPerService },
        () => {
          const messageId = ulid();
          return {
            events: syntheticCreateSequence(service.serviceId, messageId),
            messageId,
            receivedVersions: new Set<number>(),
          };
        },
      );
    }
    for (
      let offset = 0;
      offset < services.length;
      offset += options.batchSize
    ) {
      let batchEvents = 0;
      for (let version = 0; version < 3; version++) {
        for (const service of services.slice(
          offset,
          offset + options.batchSize,
        )) {
          for (const create of service.creates) {
            const event = create.events[version];
            pending.set(event.eventId, { event, sentAt: performance.now() });
            if (
              !pipeline.channel.publish(
                "io-poc-ingress",
                "event",
                Buffer.from(JSON.stringify(event)),
                { messageId: event.eventId, persistent: true },
              )
            ) {
              await new Promise<void>((resolveDrain) =>
                pipeline?.channel.once("drain", resolveDrain),
              );
            }
            batchEvents++;
          }
        }
      }
      await pipeline.channel.waitForConfirms();
      confirmedIngress += batchEvents;
      snapshots.push({
        confirmedIngress,
        nodes: await guard(),
        phase: "publication",
      });
    }
    publicationMs = performance.now() - publicationStarted;
    if (windowed) {
      for (
        let offset = 0;
        offset < services.length;
        offset += options.onlineWindow
      ) {
        const active = services.slice(offset, offset + options.onlineWindow);
        for (
          let connectOffset = 0;
          connectOffset < active.length;
          connectOffset += options.batchSize
        ) {
          await Promise.all(
            active
              .slice(connectOffset, connectOffset + options.batchSize)
              .map(openConsumer),
          );
          await guard();
        }
        const windowStarted = performance.now();
        while (
          !active.every((service) =>
            service.creates.every(
              (create) => create.receivedVersions.size === 3,
            ),
          ) &&
          performance.now() - windowStarted < options.drainSeconds * 1000
        ) {
          await delay(100);
          await guard();
        }
        assert.ok(
          active.every((service) =>
            service.creates.every(
              (create) => create.receivedVersions.size === 3,
            ),
          ),
          "A consumer window has incomplete message sequences",
        );
        const windowInventoryStarted = performance.now();
        let observed = 0;
        while (
          observed < active.length &&
          performance.now() - windowInventoryStarted < 15000
        ) {
          const current =
            await broker.request<{ user: string }[]>("/connections");
          observed = current.filter((connection) =>
            active.some(
              (service) => service.details?.username === connection.user,
            ),
          ).length;
          if (observed < active.length) await delay(250);
        }
        assert.equal(
          observed,
          active.length,
          "Window connection inventory mismatch",
        );
        observedPeakConsumerConnections = Math.max(
          observedPeakConsumerConnections,
          observed,
        );
        snapshots.push({
          connections: observed,
          nodes: await guard(),
          offset,
          phase: "consumer-window",
          received: latencies.length,
        });
        await Promise.all(active.map(closeConsumer));
        process.stdout.write(
          JSON.stringify({
            phase: "delivery",
            received: latencies.length,
            scenario: "H",
            servicesCompleted: offset + active.length,
          }) + "\n",
        );
      }
    }
    const drainStarted = performance.now();
    while (
      latencies.length < pending.size &&
      performance.now() - drainStarted < options.drainSeconds * 1000
    ) {
      await delay(100);
      await guard();
    }
    deliveryWindowMs = performance.now() - publicationStarted;
    brokerAfter = await guard();
    assert.equal(
      confirmedIngress,
      options.services * options.createsPerService * 3,
    );
    assert.equal(
      latencies.length,
      confirmedIngress,
      "Not all expected events were delivered before the drain deadline",
    );
    assert.ok(
      services.every((service) =>
        service.creates.every((create) => create.receivedVersions.size === 3),
      ),
      "At least one message sequence is incomplete",
    );
    runtime = execFileSync(
      "docker",
      [
        "stats",
        "--no-stream",
        "--format",
        "{{json .}}",
        "io-com-rabbitmq-mqtt-1",
        "io-com-mqtt-onboarding-1",
        "io-com-mqtt-publisher-1",
      ],
      { encoding: "utf8" },
    )
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line));
  } catch (error) {
    failure = error instanceof Error ? error.message : "Scenario H failed";
  } finally {
    closing = true;
    if (pipeline)
      await pipeline.connection.close().catch(() => {
        cleanupErrors.push({
          operation: "close-ingress",
          serviceId: "internal",
        });
      });
    for (
      let offset = 0;
      offset < services.length;
      offset += options.batchSize
    ) {
      await Promise.all(
        services
          .slice(offset, offset + options.batchSize)
          .map(async (service) => {
            await service.client?.endAsync(true).catch(() => {
              cleanupErrors.push({
                operation: "close-consumer",
                serviceId: service.serviceId,
              });
            });
            try {
              await jsonRequest(
                `${apiUrl}/admin/services/${service.serviceId}`,
                "DELETE",
                undefined,
                adminHeaders,
              );
            } catch {
              cleanupErrors.push({
                operation: "disable-service-and-cleanup",
                serviceId: service.serviceId,
              });
            }
          }),
      );
    }
    loopDelay.disable();
    latencies.sort((left, right) => left - right);
    const percentile = (fraction: number) =>
      latencies[
        Math.min(latencies.length - 1, Math.floor(latencies.length * fraction))
      ] ?? null;
    const completedMessages = services.reduce(
      (total, service) =>
        total +
        service.creates.filter((create) => create.receivedVersions.size === 3)
          .length,
      0,
    );
    const allServicesReceived = services.filter(
      (service) =>
        service.creates.length === options.createsPerService &&
        service.creates.every((create) => create.receivedVersions.size === 3),
    ).length;
    const success = !failure && cleanupErrors.length === 0;
    topology.peakConsumerConnections = peakConsumerConnections;
    topology.observedPeakConsumerConnections = observedPeakConsumerConnections;
    const result = {
      brokerAfter,
      brokerBefore,
      cleanupErrors,
      completedMessages,
      confirmedIngress,
      connectionErrors,
      deliveryWindowMs,
      duplicates,
      environment,
      expectedDeliveries: options.services * options.createsPerService * 3,
      expectedMessages: options.services * options.createsPerService,
      failure,
      finishedAt: new Date().toISOString(),
      generator: {
        cpu: process.cpuUsage(cpuStart),
        eventLoopP99Ms: loopDelay.percentile(99) / 1e6,
        rssBytes: process.memoryUsage().rss,
      },
      isolationViolations: violations.length,
      latencyMs: {
        p50: percentile(0.5),
        p95: percentile(0.95),
        p99: percentile(0.99),
      },
      limitation:
        "Synthetic CMS-shaped service IDs/API keys and simulated creates; no call to messages-app/services-func CreateMessages, Services CMS, real IO queues/change feeds or Azure. A fixture sequence is not a production transition graph or an MQTT ordering guarantee. One bounded local end-to-end run, not maximum capacity or SLO validation.",
      negativeProbes,
      options,
      outcome: success ? "passed" : "failed",
      pipeline:
        "Service onboarding -> one public topic; simulated creates -> correlated events -> AMQP TLS confirmed ingress -> real publisher worker -> MQTT TLS QoS1 consumer",
      provisionMs,
      publicationMs,
      publishErrors,
      runId,
      runtime,
      scenario: "H",
      sequence: [
        "ACCEPTED (v0)",
        "PROCESSED (v1)",
        "PROCESSED/isRead=true (v2)",
      ],
      services: services.map((service) => ({
        connectMs: service.connectMs,
        messages: service.creates.map((create) => ({
          complete: create.receivedVersions.size === 3,
          messageId: create.messageId,
          receivedVersions: [...create.receivedVersions].sort(),
        })),
        onboardMs: service.onboardMs,
        receivedEvents: service.receivedEvents.size,
        serviceId: service.serviceId,
        topic: service.topic,
      })),
      servicesWithAllEvents: allServicesReceived,
      snapshots,
      startedAt,
      topology,
      uniqueDeliveries: latencies.length,
      violations,
    };
    mkdirSync("results", { recursive: true });
    const file = `results/H-${runId}.json`;
    writeFileSync(file, JSON.stringify(result, null, 2));
    process.stdout.write(
      JSON.stringify({
        allServicesReceived,
        cleanupErrors: cleanupErrors.length,
        completedMessages,
        expected: result.expectedDeliveries,
        failure,
        file,
        isolationViolations: violations.length,
        latencyMs: result.latencyMs,
        outcome: result.outcome,
        received: latencies.length,
        scenario: "H",
        topology,
      }) + "\n",
    );
    if (!success) process.exitCode = 1;
  }
}
