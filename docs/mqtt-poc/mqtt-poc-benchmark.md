# MQTT PoC Benchmark Report

Generated from observed local results on 2026-10-14T08:46:53.045Z. No production SLO or maximum capacity is claimed.

## Environment

- macOS host, shared local load generator and Docker VM: architecture=aarch64, CPUs=4, memoryBytes=16748224512.
- RabbitMQ 4.3.6, Erlang 27.3.4.18; one node, classic queues, MQTT 5, QoS 1, verified TLS.
- RabbitMQ image digest: sha256:8dd6e3570ddaa2ef82a6c3a8950e79c1f73893adfbdddbc374fc1f1ac8a0f5dd. Broker: 2 CPUs / 1536 MiB container ceiling; configured memory watermark 768 MiB. Onboarding/auth: 1 CPU / 512 MiB. Prometheus: 0.25 CPU / 256 MiB.
- Server session expiry cap 3600 seconds; publisher/test message expiry configurable; queue limits 1000 messages / 16 MiB, drop-head to private DLX. TLS is included in all recorded MQTT runs.

## Observed Runs

| Scenario | Services | Topic names | Subscriptions | Persistent sessions | Consumer connections | Session queues | Published | Unique/expected delivery | Publish/s | p95 ms | Pending/expired |
| -------- | -------: | ----------: | ------------: | ------------------: | -------------------: | -------------: | --------: | -----------------------: | --------: | -----: | --------------: |
| A        |        1 |         100 |             1 |                   1 |                    1 |              1 |       100 |                      1/1 |   1315.74 |   9.91 |               0 |
| A        |        1 |        1000 |             1 |                   1 |                    1 |              1 |      1000 |                      1/1 |   1897.40 |   8.23 |               0 |
| A        |        1 |        5000 |             1 |                   1 |                    1 |              1 |      5000 |                      1/1 |   1837.62 |   9.83 |               0 |
| A        |        1 |       10000 |             1 |                   1 |                    1 |              1 |     10000 |                      1/1 |   1868.52 |  12.96 |               0 |
| B        |        1 |           1 |           500 |                 500 |                  500 |            500 |        30 |              15000/15000 |     20.00 |  46.03 |               0 |
| B        |        1 |         100 |           200 |                   0 |                    2 |              2 |       100 |                  200/200 |    737.91 |   2.01 |               0 |
| B        |        1 |         100 |           200 |                   2 |                    2 |              2 |       100 |                  200/200 |    861.72 |   1.25 |               0 |
| B        |        1 |        1000 |         10000 |                  10 |                   10 |             10 |      1000 |              10000/10000 |    515.01 |   2.07 |               0 |
| C        |        3 |           3 |            25 |                  25 |                   25 |             25 |         0 |                      0/0 |      0.00 |    n/a |               0 |
| C        |        3 |           3 |           100 |                 100 |                  100 |            100 |         0 |                      0/0 |      0.00 |    n/a |               0 |
| D        |        3 |           3 |            25 |                  25 |                   25 |             25 |      1500 |              12500/12500 |    754.92 |   2.50 |               0 |
| E        |        3 |           3 |            12 |                  12 |                   12 |             12 |       600 |                2400/2400 |    839.14 | 678.75 |               0 |
| F        |        3 |           3 |            10 |                  10 |                   10 |             10 |       300 |                1000/1000 |    881.69 |   1.41 |               0 |
| G #1     |        3 |           3 |             3 |                   3 |                    3 |              3 |        60 |                    60/60 |    662.93 |   1.99 |               0 |
| G #1     |        3 |           3 |            25 |                  25 |                   25 |             25 |       900 |                7500/7500 |    559.66 |   1.95 |               0 |
| G #2     |        3 |           3 |            25 |                  25 |                   25 |             25 |       900 |                7500/7500 |    574.20 |   1.93 |               0 |
| G #3     |        3 |           3 |            25 |                  25 |                   25 |             25 |       900 |                7500/7500 |    549.49 |   2.13 |               0 |

There are additional internal publisher connections (see the machine-readable topology), an internal AMQP worker and transient management requests. The table intentionally does not equate connections, subscriptions or queue counts. In A, only one topic has a matching subscription: the other accepted publications are intentional no-subscriber controls, not missing expected deliveries. A has only one latency sample per run; its percentile is not statistically representative.

## Resources and Lifecycle

| Scenario/configuration           | Full onboarding ms | Broker before MiB | Broker after MiB | Generator RSS MiB | Generator event-loop p99 ms | Offline recovery/churn ms |
| -------------------------------- | -----------------: | ----------------: | ---------------: | ----------------: | --------------------------: | ------------------------: |
| A / 1 consumers / 1 filters      |              77.56 |            148.69 |           148.69 |            101.91 |                       37.58 |                       n/a |
| A / 1 consumers / 1 filters      |              80.64 |            151.91 |           151.91 |            118.25 |                       40.27 |                       n/a |
| A / 1 consumers / 1 filters      |              80.62 |            151.91 |           151.16 |            119.98 |                       22.53 |                       n/a |
| A / 1 consumers / 1 filters      |              75.09 |            151.16 |           151.41 |            122.41 |                       21.33 |                       n/a |
| B / 500 consumers / 500 filters  |           15196.87 |            364.32 |           292.45 |            210.84 |                       22.13 |                       n/a |
| B / 2 consumers / 200 filters    |             312.54 |            151.42 |           152.43 |            106.81 |                       25.84 |                       n/a |
| B / 2 consumers / 200 filters    |             317.63 |            151.41 |           151.42 |            106.91 |                       35.29 |                       n/a |
| B / 10 consumers / 10000 filters |           12431.55 |            162.35 |           364.32 |            162.42 |                       22.38 |                       n/a |
| C / 25 consumers / 25 filters    |             689.13 |            152.43 |           155.55 |            105.81 |                       39.62 |                       n/a |
| C / 100 consumers / 100 filters  |            2825.04 |            155.55 |           160.55 |            121.89 |                       21.94 |                       n/a |
| D / 25 consumers / 25 filters    |             678.62 |            160.55 |           175.46 |            127.75 |                       22.43 |                       n/a |
| E / 12 consumers / 12 filters    |             341.84 |            175.46 |           171.64 |            121.94 |                       38.90 |                    120.05 |
| F / 10 consumers / 10 filters    |             311.09 |            171.64 |           170.32 |            117.77 |                       38.08 |                    207.59 |
| G / 3 consumers / 3 filters      |             166.13 |            146.16 |           145.39 |            116.80 |                       50.86 |                       n/a |
| G / 25 consumers / 25 filters    |             687.12 |            170.32 |           166.80 |            123.86 |                       22.54 |                       n/a |
| G / 25 consumers / 25 filters    |             649.10 |            166.80 |           167.14 |            129.91 |                       23.18 |                       n/a |
| G / 25 consumers / 25 filters    |             645.17 |            167.14 |           167.73 |            161.77 |                       22.82 |                       n/a |

Broker snapshots include runtime/GC, routing, connections and queue state; their difference is not a precise per-subscription memory allocation. Container CPU/memory snapshots, disk free space, backlog snapshots, connect latency and sampled broker states are retained in the JSON evidence. Disk free space is not equivalent to bytes consumed by a particular tenant.

## Method and Reproduction

Run from the repository root:

```sh
pnpm --filter mqtt-poc benchmark:matrix
pnpm --filter mqtt-poc benchmark --scenario B --tenants 1 --connections 10 --topics 1000 --filters 1000 --messages 1000
pnpm --filter mqtt-poc benchmark --scenario B --tenants 1 --connections 500 --topics 1 --filters 1 --messages 30
pnpm --filter mqtt-poc run report
```

The runner provisions synthetic services through the private API, establishes real authorized MQTT subscriptions, applies a configurable warm-up, publishes closed-loop QoS 1 traffic, drains to a bounded deadline, checks service ownership for every delivery, then revokes its registrations and disables its synthetic services. G also attempts a cross-service SUBSCRIBE during publishing. G at 25 consumers is repeated three times. Other points are exploratory single samples, not confidence intervals. The benchmark-only envelope adds synthetic padding; it is deliberately distinct from the public event schema.

Stop criteria: configured connection ceiling (500 consumer connections by default), broker memory/disk alarms, memory above 85% of the configured watermark, file descriptors above 80%, or any isolation violation. The generator records CPU, RSS and event-loop delay separately. Resource probing/management and local co-location affect the observed rates. Publish rates are achieved rates, not broker saturation capacity. Latency uses one generator monotonic clock; distributed clock synchronization has not been evaluated.

## Reliability and Security Evidence

The real-broker isolation suite verifies API authentication, spoofed identity denial, idempotency, applied native topic/resource ACLs, A/B/C routing, clientId takeover rejection with clean and resumed sessions, wrong password, anonymous CONNECT, cross-service and wildcard SUBSCRIBE, external PUBLISH denial, and revocation of active connections. Denials use MQTT reason codes and broker ACL inspection, not absence during a timeout alone.

The reliability suite demonstrates five offline queued events recovered, repeated event IDs, deliberately delayed protocol ACK, TCP interruption before PUBACK, message expiry with a live-marker control, session expiry with binding removal, and invalid internal payload rejection into DLQ with x-death metadata. Subscriber business failures remain the integrator's responsibility.

## Problems and Limits

- A stale Management configuration value was rejected during bootstrap and corrected before recorded runs. An internal Docker network prevented loopback forwarding in this runtime; the dedicated bridge now exposes only loopback ports.
- MQTT SUBACK/PUBACK reason codes required explicit unauthorized-operation response configuration; permissions were not weakened.
- Transient exclusive queues briefly remain locked during close; cleanup retries that conflict for up to one second while the identity stays disabled.
- DLQ inspection must not repeatedly requeue its first entry; test diagnostics temporarily hold a bounded sample and requeue it afterward.
- 500 persistent sessions were exercised, not thousands; many thousands of services/credentials/concurrent sessions are unverified. 10000 filters on 10 queues do not establish capacity for 10000 persistent queues.
- Long-running soak, exhaustion/backpressure saturation, consumer restarts with durable deduplication, sustained offline retention, Linux host portability, cluster/quorum/HA and Azure deployment are unverified. Broker failure tests were excluded by agreement.
- The issuer uses one local atomic JSON registry with single-process serialization, synthetic key mappings and protected plaintext issuance material. This is not production IAM, secret storage, a replicated provisioning database or crash-durable transactional outbox.
- Classic DLX is not an end-to-end guaranteed error archive during broker failure. An ingress publisher confirms acceptance; MQTT PUBACK never confirms subscriber business processing.

## Conclusion

The measured local results demonstrate service-scoped delivery and independent growth of topic names, filters and session queues. They justify further non-production evaluation, not a production adoption decision. All measured runs have 0 observed isolation violations; inspect individual counts/errors in the evidence. Azure requires a new design/approval round after local review.

The historical A-G limits above describe those runs only. Scenario H below additionally demonstrates 1000 service-scoped persistent sessions with windowed delivery.

## Scenario H: Service Creates and Correlated Events

This separate end-to-end case uses one exact public topic, consumer registration and persistent session per synthetic CMS-shaped serviceId. Each service simulates multiple CreateMessages requests: each create gets a distinct ULID messageId and the approved fixture ACCEPTED(v0), PROCESSED(v1), PROCESSED/isRead=true(v2). All three events use the same messageId and the service's topic. The fixture is not the production transition graph, and receipt order is not asserted. No real messages-app/services-func CreateMessages, Services CMS, IO queue/change feed or Azure resource is invoked.

Unlike A-G, H sends strict public events through the confirmed AMQP TLS ingress, the running publisher worker, and MQTT TLS QoS1. It verifies every eventId, payload, serviceId, messageId and version; every create and service must receive its full sequence. Native queue/binding inventory confirms one exact subscription per service, and cross-service/wildcard attempts require explicit negative SUBACKs.

| Requested services | Outcome | Observed peak consumer connections | Session queues | Complete/expected creates | Received/expected events | Services with all events | Onboarding s | Publication-to-drain s |   p95 ms | Cleanup errors |
| ------------------ | ------- | ---------------------------------: | -------------: | ------------------------: | -----------------------: | -----------------------: | -----------: | ---------------------: | -------: | -------------: |
| 3                  | failed  |                                  0 |              3 |                       0/6 |                     0/18 |                        0 |         0.09 |                   0.00 |      n/a |              0 |
| 3                  | passed  |                                  3 |              3 |                       6/6 |                    18/18 |                        3 |         0.09 |                   0.12 |    12.48 |              0 |
| 100                | passed  |                                100 |            100 |                   300/300 |                  900/900 |                      100 |         1.64 |                   0.29 |   129.74 |              0 |
| 1000               | failed  |                                n/a |            n/a |                    0/3000 |                   0/9000 |                        0 |         0.00 |                   0.00 |      n/a |            951 |
| 6                  | passed  |                                  3 |              6 |                     12/12 |                    36/36 |                        6 |         0.14 |                   9.37 |  4425.85 |              0 |
| 1000               | passed  |                                250 |           1000 |                 3000/3000 |                9000/9000 |                     1000 |        17.80 |                  18.12 | 13265.55 |              0 |
| 6                  | passed  |                                  3 |              6 |                     12/12 |                    36/36 |                        6 |         0.16 |                   5.48 |   557.37 |              0 |

The 1000-service passed run verifies 1000 topics, subscriptions, persistent sessions and session queues, 3000 distinct creates and 9000 events. Consumers resume in windows of 250; it does NOT demonstrate 1000 simultaneous connections. Latency in windowed runs includes deliberate offline queueing, sequential window activation and Management inventory refresh delays, not just transport or worker latency. Onboarding includes local synthetic service enablement and credential/session provisioning.

The failed 1000-concurrent attempt stopped during onboarding before publication. The Docker daemon subsequently became unreachable while Rancher reported the VM started; the cause was not established, so this is neither a RabbitMQ capacity verdict nor a successful delivery run. Its 950 synthetic service records were later cleaned up after an explicitly approved runtime restart. The original failure remains in the evidence, alongside any separate cleanup-recovery records. Zero delivered events in that attempt is not evidence of isolation.

Reproduce from the repository root:

```sh
pnpm --filter mqtt-poc test:services --services 100 --creates-per-service 3
pnpm --filter mqtt-poc test:services --services 1000 --creates-per-service 3 --online-window 250 --batch-size 25
# Full concurrency is opt-in after runtime/resource review, not part of the default matrix:
pnpm --filter mqtt-poc test:services --services 1000 --creates-per-service 3 --online-window 1000 --max-connections 1000
# Retry scoped cleanup only for an interrupted H manifest:
pnpm --filter mqtt-poc test:services --cleanup-run H-RUN-ID.json
```

Default H uses 1000 services, three creates per service and a 250-consumer online window. It has its own explicit connection ceiling and broker memory/disk/FD stop guards; A-G's 500-consumer default is unchanged. Cleanups affect only service IDs recorded in that run and never delete actual IO services. Raw per-service/per-message evidence is retained without credentials.
