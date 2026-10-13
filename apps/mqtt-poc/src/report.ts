import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import z from "zod";

import { eventSchema } from "./domain/event.js";

const resultSchema = z
  .object({
    at: z.string(),
    brokerAfter: z.array(
      z.object({ disk_free: z.number(), mem_used: z.number() }).passthrough(),
    ),
    brokerBefore: z.array(
      z.object({ disk_free: z.number(), mem_used: z.number() }).passthrough(),
    ),
    churnMs: z.number().nullable().optional(),
    connectionErrors: z.number(),
    duplicates: z.number(),
    environment: z
      .object({ erlang_version: z.string(), rabbitmq_version: z.string() })
      .passthrough(),
    expectedDeliveries: z.number(),
    generator: z.record(z.string(), z.number()),
    isolationViolations: z.number(),
    latencyMs: z.object({
      p50: z.number().nullable(),
      p95: z.number().nullable(),
      p99: z.number().nullable(),
    }),
    options: z
      .object({
        connections: z.number(),
        filters: z.number(),
        messages: z.number(),
        payload: z.number(),
        publishers: z.number(),
        scenario: z.string(),
        session: z.number(),
        tenants: z.number(),
        topics: z.number(),
      })
      .passthrough(),
    outcome: z.literal("measured"),
    pendingOrExpired: z.number(),
    provisionMs: z.number(),
    publishErrors: z.number(),
    publishMs: z.number(),
    publishRate: z.number().nullable(),
    published: z.number(),
    recoveryMs: z.number().nullable(),
    repetition: z.number(),
    runId: z.string(),
    runtime: z.array(z.record(z.string(), z.unknown())),
    topology: z.record(z.string(), z.number()),
    uniqueDeliveries: z.number(),
  })
  .passthrough();
const latest = new Map<string, z.infer<typeof resultSchema>>();
for (const file of readdirSync("results")) {
  if (!/^[A-G]-.*\.json$/.test(file) || file.endsWith("-failed.json")) continue;
  const parsed = resultSchema.safeParse(
    JSON.parse(readFileSync(resolve("results", file), "utf8")),
  );
  if (!parsed.success) continue;
  const result = parsed.data;
  const key = JSON.stringify([
    result.options.scenario,
    result.options.connections,
    result.options.topics,
    result.options.filters,
    result.options.messages,
    result.options.session,
    result.repetition,
  ]);
  const previous = latest.get(key);
  if (!previous || previous.at < result.at) latest.set(key, result);
}
const results = [...latest.values()].sort(
  (left, right) =>
    left.options.scenario.localeCompare(right.options.scenario) ||
    left.options.topics - right.options.topics ||
    left.options.connections - right.options.connections ||
    left.repetition - right.repetition,
);
if (!results.length) throw new Error("No observed benchmark results available");
const hardware = execFileSync(
  "docker",
  [
    "info",
    "--format",
    "architecture={{.Architecture}}, CPUs={{.NCPU}}, memoryBytes={{.MemTotal}}",
  ],
  { encoding: "utf8" },
).trim();
const number = (value: null | number | undefined) =>
  value === null || value === undefined ? "n/a" : value.toFixed(2);
const table = results
  .map(
    (result) =>
      `| ${result.options.scenario}${result.options.scenario === "G" ? ` #${result.repetition + 1}` : ""} | ${result.options.tenants} | ${result.options.topics} | ${result.topology.acceptedSubscriptions} | ${result.topology.persistentSessions} | ${result.options.connections} | ${result.topology.observedSessionQueues} | ${result.published} | ${result.uniqueDeliveries}/${result.expectedDeliveries} | ${number(result.publishRate)} | ${number(result.latencyMs.p95)} | ${result.pendingOrExpired} |`,
  )
  .join("\n");
const resources = results
  .map(
    (result) =>
      `| ${result.options.scenario} / ${result.options.connections} consumers / ${result.topology.acceptedSubscriptions} filters | ${number(result.provisionMs)} | ${number(result.brokerBefore[0].mem_used / 1048576)} | ${number(result.brokerAfter[0].mem_used / 1048576)} | ${number(result.generator.rssBytes / 1048576)} | ${number(result.generator.eventLoopP99Ms)} | ${number(result.recoveryMs ?? result.churnMs)} |`,
  )
  .join("\n");
const doc = `# MQTT PoC Benchmark Report\n\nGenerated from observed local results on ${new Date().toISOString()}. No production SLO or maximum capacity is claimed.\n\n## Environment\n\n- macOS host, shared local load generator and Docker VM: ${hardware}.\n- RabbitMQ ${results[0].environment.rabbitmq_version}, Erlang ${results[0].environment.erlang_version}; one node, classic queues, MQTT 5, QoS 1, verified TLS.\n- RabbitMQ image digest: sha256:8dd6e3570ddaa2ef82a6c3a8950e79c1f73893adfbdddbc374fc1f1ac8a0f5dd. Broker: 2 CPUs / 1536 MiB container ceiling; configured memory watermark 768 MiB. Onboarding/auth: 1 CPU / 512 MiB. Prometheus: 0.25 CPU / 256 MiB.\n- Server session expiry cap 3600 seconds; publisher/test message expiry configurable; queue limits 1000 messages / 16 MiB, drop-head to private DLX. TLS is included in all recorded MQTT runs.\n\n## Observed Runs\n\n| Scenario | Services | Topic names | Subscriptions | Persistent sessions | Consumer connections | Session queues | Published | Unique/expected delivery | Publish/s | p95 ms | Pending/expired |\n| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |\n${table}\n\nThere are additional internal publisher connections (see the machine-readable topology), an internal AMQP worker and transient management requests. The table intentionally does not equate connections, subscriptions or queue counts. In A, only one topic has a matching subscription: the other accepted publications are intentional no-subscriber controls, not missing expected deliveries. A has only one latency sample per run; its percentile is not statistically representative.\n\n## Resources and Lifecycle\n\n| Scenario/configuration | Full onboarding ms | Broker before MiB | Broker after MiB | Generator RSS MiB | Generator event-loop p99 ms | Offline recovery/churn ms |\n| --- | ---: | ---: | ---: | ---: | ---: | ---: |\n${resources}\n\nBroker snapshots include runtime/GC, routing, connections and queue state; their difference is not a precise per-subscription memory allocation. Container CPU/memory snapshots, disk free space, backlog snapshots, connect latency and sampled broker states are retained in the JSON evidence. Disk free space is not equivalent to bytes consumed by a particular tenant.\n\n## Method and Reproduction\n\nRun from the repository root:\n\n\`\`\`sh\npnpm --filter mqtt-poc benchmark:matrix\npnpm --filter mqtt-poc benchmark --scenario B --tenants 1 --connections 10 --topics 1000 --filters 1000 --messages 1000\npnpm --filter mqtt-poc benchmark --scenario B --tenants 1 --connections 500 --topics 1 --filters 1 --messages 30\npnpm --filter mqtt-poc run report\n\`\`\`\n\nThe runner provisions synthetic services through the private API, establishes real authorized MQTT subscriptions, applies a configurable warm-up, publishes closed-loop QoS 1 traffic, drains to a bounded deadline, checks service ownership for every delivery, then revokes its registrations and disables its synthetic services. G also attempts a cross-service SUBSCRIBE during publishing. G at 25 consumers is repeated three times. Other points are exploratory single samples, not confidence intervals. The benchmark-only envelope adds synthetic padding; it is deliberately distinct from the public event schema.\n\nStop criteria: configured connection ceiling (500 consumer connections by default), broker memory/disk alarms, memory above 85% of the configured watermark, file descriptors above 80%, or any isolation violation. The generator records CPU, RSS and event-loop delay separately. Resource probing/management and local co-location affect the observed rates. Publish rates are achieved rates, not broker saturation capacity. Latency uses one generator monotonic clock; distributed clock synchronization has not been evaluated.\n\n## Reliability and Security Evidence\n\nThe real-broker isolation suite verifies API authentication, spoofed identity denial, idempotency, applied native topic/resource ACLs, A/B/C routing, clientId takeover rejection with clean and resumed sessions, wrong password, anonymous CONNECT, cross-service and wildcard SUBSCRIBE, external PUBLISH denial, and revocation of active connections. Denials use MQTT reason codes and broker ACL inspection, not absence during a timeout alone.\n\nThe reliability suite demonstrates five offline queued events recovered, repeated event IDs, deliberately delayed protocol ACK, TCP interruption before PUBACK, message expiry with a live-marker control, session expiry with binding removal, and invalid internal payload rejection into DLQ with x-death metadata. Subscriber business failures remain the integrator's responsibility.\n\n## Problems and Limits\n\n- A stale Management configuration value was rejected during bootstrap and corrected before recorded runs. An internal Docker network prevented loopback forwarding in this runtime; the dedicated bridge now exposes only loopback ports.\n- MQTT SUBACK/PUBACK reason codes required explicit unauthorized-operation response configuration; permissions were not weakened.\n- Transient exclusive queues briefly remain locked during close; cleanup retries that conflict for up to one second while the identity stays disabled.\n- DLQ inspection must not repeatedly requeue its first entry; test diagnostics temporarily hold a bounded sample and requeue it afterward.\n- 500 persistent sessions were exercised, not thousands; many thousands of services/credentials/concurrent sessions are unverified. 10000 filters on 10 queues do not establish capacity for 10000 persistent queues.\n- Long-running soak, exhaustion/backpressure saturation, consumer restarts with durable deduplication, sustained offline retention, Linux host portability, cluster/quorum/HA and Azure deployment are unverified. Broker failure tests were excluded by agreement.\n- The issuer uses one local atomic JSON registry with single-process serialization, synthetic key mappings and protected plaintext issuance material. This is not production IAM, secret storage, a replicated provisioning database or crash-durable transactional outbox.\n- Classic DLX is not an end-to-end guaranteed error archive during broker failure. An ingress publisher confirms acceptance; MQTT PUBACK never confirms subscriber business processing.\n\n## Conclusion\n\nThe measured local results demonstrate service-scoped delivery and independent growth of topic names, filters and session queues. They justify further non-production evaluation, not a production adoption decision. All measured runs have ${results.reduce((total, result) => total + result.isolationViolations, 0)} observed isolation violations; inspect individual counts/errors in the evidence. Azure requires a new design/approval round after local review.\n`;
writeFileSync(resolve("../../docs/mqtt-poc-benchmark.md"), doc);
writeFileSync(
  resolve("../../docs/mqtt-poc-benchmark-results.json"),
  JSON.stringify(
    { generatedAt: new Date().toISOString(), hardware, runs: results },
    null,
    2,
  ),
);
writeFileSync(
  resolve("../../docs/mqtt-poc-event.schema.json"),
  JSON.stringify(z.toJSONSchema(eventSchema), null, 2),
);
