# Service-Isolated MQTT PoC

Local, synthetic-only MQTT 5 event delivery. A service, not an organization, is the security boundary. Azure deployment is intentionally excluded.

## Code Map

| File                                                                                                                                                                                            | Responsibility                                                                                                             | Execution                                        |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| [src/setup.ts](src/setup.ts)                                                                                                                                                                    | Generate local CA/certificates, synthetic keys and RabbitMQ definitions; refuse overwriting state                          | One-time setup                                   |
| [src/stack.ts](src/stack.ts)                                                                                                                                                                    | Select only PoC services from the root Compose, then start/stop them                                                       | `local:up` / `local:stop`                        |
| [src/config.ts](src/config.ts)                                                                                                                                                                  | Load local configuration, protected credentials and certificates                                                           | Shared helper                                    |
| [src/server.ts](src/server.ts)                                                                                                                                                                  | Public-to-local onboarding/admin API and broker-private mTLS authentication callback                                       | Onboarding container; two listeners, one process |
| [src/application/registry.ts](src/application/registry.ts)                                                                                                                                      | Idempotent registration, pending/active/revoked states, rotation and cleanup; atomic JSON persistence                      | Called by API/auth                               |
| [src/domain/policy.ts](src/domain/policy.ts)                                                                                                                                                    | Topic names, native resource/topic ACLs and identity/clientId checks                                                       | Called by provisioning/auth                      |
| [src/domain/event.ts](src/domain/event.ts)                                                                                                                                                      | Strict public event schema and approved synthetic per-create sequence                                                      | Worker, simulators and tests                     |
| [src/adapters/broker.ts](src/adapters/broker.ts)                                                                                                                                                | Management HTTPS users/permissions/read-back, connection closure and bounded queue cleanup                                 | Trusted control plane only                       |
| [src/adapters/http.ts](src/adapters/http.ts)                                                                                                                                                    | Verified HTTPS JSON requests                                                                                               | Internal tooling                                 |
| [src/adapters/mqtt.ts](src/adapters/mqtt.ts)                                                                                                                                                    | Standard MQTT 5/TLS connection helper                                                                                      | Internal tooling/tests                           |
| [src/publisher.ts](src/publisher.ts)                                                                                                                                                            | Private AMQP ingress/DLX/DLQ and worker: validate, MQTT publish, ACK ingress                                               | Publisher container                              |
| [src/demo.ts](src/demo.ts)                                                                                                                                                                      | Obtain a demo connection bundle through the API or enqueue one synthetic event                                             | Manual demo                                      |
| [examples/external-consumer/consumer.ts](examples/external-consumer/consumer.ts)                                                                                                                | Broker-independent consumer, strict validation, reconnect and bounded in-memory deduplication                              | Independent external process                     |
| [src/integration.ts](src/integration.ts)                                                                                                                                                        | Service/clientId isolation, negative reason codes and revocation                                                           | `test:integration`                               |
| [src/reliability.ts](src/reliability.ts)                                                                                                                                                        | Offline delivery, expiry, pre-PUBACK interruption and internal DLQ                                                         | `test:reliability`                               |
| [src/dx-test.ts](src/dx-test.ts)                                                                                                                                                                | Copy/install/run the consumer outside the monorepo and verify ingress delivery                                             | `test:dx`                                        |
| [src/benchmark.ts](src/benchmark.ts)                                                                                                                                                            | Independent A-G topic/filter/session/connection dimensions; direct MQTT publication                                        | `benchmark`                                      |
| [src/matrix.ts](src/matrix.ts)                                                                                                                                                                  | Execute the predefined exploratory A-G configurations                                                                      | `benchmark:matrix`                               |
| [src/service-scenario.ts](src/service-scenario.ts)                                                                                                                                              | H: many services, multiple simulated creates per service, correlated event sequences on exact public topics via the worker | `test:services`                                  |
| [src/report.ts](src/report.ts)                                                                                                                                                                  | Generate reports, selected observed evidence and public schema                                                             | `report`                                         |
| [infra/rabbitmq.conf](infra/rabbitmq.conf), [advanced.config](infra/advanced.config), [enabled_plugins](infra/enabled_plugins)                                                                  | Broker TLS, HTTP authn/native authz, expiry/resource limits and plugins                                                    | RabbitMQ startup                                 |
| [infra/bootstrap.sh](infra/bootstrap.sh)                                                                                                                                                        | Copy only broker-specific keys/definitions with rabbitmq ownership                                                         | RabbitMQ entrypoint                              |
| [infra/prometheus.yml](infra/prometheus.yml)                                                                                                                                                    | Scrape aggregate private broker metrics                                                                                    | Prometheus container                             |
| [Dockerfile](Dockerfile), [compose.yml](../../compose.yml)                                                                                                                                      | Build Node entrypoints and run four optional PoC containers                                                                | Local runtime                                    |
| [src/domain/**tests**/event.test.ts](src/domain/__tests__/event.test.ts), [policy.test.ts](src/domain/__tests__/policy.test.ts), [registry.test.ts](src/application/__tests__/registry.test.ts) | Pure contract, policy and provisioning lifecycle checks                                                                    | Vitest                                           |

The always-running containers are RabbitMQ, onboarding/auth, publisher/worker and Prometheus. Scripts and the external consumer are separate processes. A-G publishes directly to MQTT; the demo and H pass through AMQP ingress and the actual worker. See the [operational diagrams](../../docs/mqtt-poc/mqtt-poc-architecture.md#operational-flows-and-how-to-try-them).

## Start

From the repository root, with Node 24.16, pnpm 10.33, Docker Compose v2+ and OpenSSL available:

```sh
pnpm install --frozen-lockfile --ignore-scripts
pnpm --filter mqtt-poc run setup
pnpm --filter mqtt-poc local:up
pnpm --filter mqtt-poc test:integration
pnpm --filter mqtt-poc test:reliability
pnpm --filter mqtt-poc test:dx
```

Setup refuses to overwrite existing state. Synthetic credentials and certificates are generated under `local/`, ignored by Git. Certificates expire in 30 days. Keep this directory private; never commit it or use production credentials. A fresh setup must be paired with a fresh **PoC broker volume** so imported operator credentials match. Do not remove repository-wide volumes.

`local:up` derives only the `mqtt-poc` profile services from the root Compose model using `--no-env-resolution`. This avoids requiring unrelated applications' ignored `.env` files. It does not remove orphan containers, start unrelated services, or change Event Hubs ports. Direct Compose usage is also supported when the existing application environment files are valid:

```sh
docker compose --profile mqtt-poc up -d --build --wait --wait-timeout 90 mqtt-onboarding rabbitmq-mqtt mqtt-publisher mqtt-prometheus
```

## Local Interfaces

| Interface                      | Endpoint                  | Access                                     |
| ------------------------------ | ------------------------- | ------------------------------------------ |
| Onboarding API                 | `https://localhost:18443` | Synthetic service key in `x-api-key`       |
| MQTT                           | `mqtts://localhost:18883` | Assigned MQTT username/password/clientId   |
| Management UI                  | `https://localhost:15681` | Operator only                              |
| Prometheus UI                  | `http://localhost:19090`  | Loopback diagnostics only                  |
| AMQP TLS                       | `amqps://localhost:15682` | Trusted internal diagnostics/producer only |
| Broker authentication callback | Container-private `8444`  | Broker certificate required; not published |

Management uses username `operator`; its generated password is in the protected `local/config.json` file. Do not print it in logs or scripts. Import `local/certs/ca.pem` into a local browser trust profile to inspect the HTTPS UI. The consumer explicitly loads this CA; no TLS verification bypass is used. The public CA certificate, not the CA private key, is provided to consumers.

Use Management **Connections**, **Queues**, **Exchanges/Bindings**, **Permissions**, and the private `io-poc-dlq` queue. MQTT subscription filters appear as bindings; queues belong to sessions, not individual topic names. The UI cannot show historical messages already consumed. Inspect DLQ messages using requeue, outside benchmark runs. Never use **Get messages** on active MQTT session queues during measurements. Authentication/permission errors are in broker logs and aggregate auth counters. No additional UI or Grafana is necessary.

## Demo

```sh
pnpm --filter mqtt-poc demo
```

This calls the onboarding API for synthetic service A and writes `local/consumer.json` without printing credentials. Copy the independent `examples/external-consumer` project outside the monorepo, install its three public dependencies with `npm install`, then run:

```sh
MQTT_CONFIG_PATH=/absolute/path/to/apps/mqtt-poc/local/consumer.json \
MQTT_CA_PATH=/absolute/path/to/apps/mqtt-poc/local/certs/ca.pem npm start
```

In another terminal at the repository root:

```sh
pnpm --filter mqtt-poc demo --publish
```

The event enters the private ingress queue, is validated and forwarded to MQTT, and the consumer prints a simulated processing result. `test:dx` automatically performs this outside-monorepo install, TLS subscription, ingress delivery and graceful shutdown. `test:integration` verifies another service cannot use the same topic or clientId.

## Operator API

Operator routes are loopback-only in this environment and require a separate `x-admin-key`. Service routes never trust a caller-supplied `serviceId`.

| Method/path                                       | Purpose                                                                              |
| ------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `POST /admin/services`                            | Enable synthetic `{serviceId, apiKey}`; repeat with same key is idempotent           |
| `DELETE /admin/services/{serviceId}`              | Disable key and revoke its registrations; does not delete any IO service             |
| `POST /subscriptions`                             | Service key creates/resumes `{appId}` registration; identity comes only from the key |
| `GET /subscriptions`                              | List that service's own registrations without secrets                                |
| `PUT /admin/subscriptions/{username}/credentials` | Disable, disconnect, rotate, verify ACLs, reactivate                                 |
| `DELETE /admin/subscriptions/{username}`          | Disable first, disconnect, remove users/session resources; repeatable                |

`appId` is the idempotency key within a service. Repeated successful onboarding returns the same protected connection bundle. Revoked app registrations cannot be reactivated by a service; use a new operator-authorized registration. A failed operation stays pending/revoking and must be retried. There is no automatic recovery daemon or transactional cross-process registry.

## Benchmarks

```sh
pnpm --filter mqtt-poc benchmark:matrix
pnpm --filter mqtt-poc benchmark --scenario B --tenants 1 --connections 10 --topics 1000 --filters 1000 --messages 1000
pnpm --filter mqtt-poc benchmark --scenario B --tenants 1 --connections 500 --topics 1 --filters 1 --messages 30
pnpm --filter mqtt-poc run report
```

Options independently configure scenario A-G, tenants, topics, connections, filters per session, publishers, messages, synthetic payload padding, offline fraction, actual ACK delay (`--slow` in ms), message/session expiry, rate (zero means closed-loop unthrottled), warm-up, drain deadline, repeats and churn. Defaults are calibration parameters, not production requirements. `--maxConnections` defaults to 500 and must be explicitly reviewed before raising it. There is no automatic assumption that this host can support 10000 concurrent connections.

A controls topic-name cardinality with fixed subscriptions; B controls filters/session and session count; C controls concurrent connections; D publication and fanout; E offline backlog; F connection churn; G per-delivery isolation and a cross-service subscription probe. `--session 0` exercises nonpersistent sessions. Benchmark-only padded envelopes use a separate service-scoped `/bench/` suffix and are not the public event contract. Raw JSON is under `results/`; the generated evidence bundle under `docs/` retains the selected observed runs.

## Scenario H: Many Services and Message Lifecycles

In real IO, an enabled Services CMS `serviceId` calls CreateMessages (currently through `services-func` in production; `messages-app` is the future surface without production traffic yet). The existing IO queue flow subsequently produces message events. **This PoC does not call or connect to any of those real components.**

H models that relationship synthetically: one service key/consumer registration/topic per service, multiple simulated creates per service, and a distinct ULID `messageId` for every create. Each create generates the approved fixture `ACCEPTED` (v0), `PROCESSED` (v1), then `message.read.changed`/`isRead=true` (v2). Those events return to the same service topic, not a topic per message. Read is simulated for this fixture, not presumed for every real IO message. Arrival order is not asserted.

```sh
# Small smoke test of the complete path:
pnpm --filter mqtt-poc test:services --services 6 --creates-per-service 2 --online-window 3 --batch-size 3
# Requested application-like scale: 1000 services, 3000 creates, 9000 events:
pnpm --filter mqtt-poc test:services --services 1000 --creates-per-service 3 --online-window 250 --batch-size 25
pnpm --filter mqtt-poc run report
```

Every service onboards through the real local API, subscribes to its exact public topic, and receives unwrapped public-schema events through **synthetic create/event simulator -> confirmed AMQP TLS ingress -> running publisher worker -> MQTT TLS QoS1 consumer**. The test checks event identity/content, service ownership, message correlation and all three versions for every create. It also verifies queue/binding inventory and explicit rejection of cross-service/wildcard subscriptions.

The 1000-service run passed with 1000 topics/subscriptions/persistent sessions/queues, 3000 complete message sequences and all 9000 expected deliveries, zero isolation violations or cleanup errors. Consumers resumed in windows of 250, so this is **not** a proof of 1000 simultaneous connections. The earlier full-concurrency attempt stopped during onboarding when the Docker daemon became unreachable; it is retained as failed evidence, not labeled a broker capacity limit. Latency for windowed H includes intentional offline waiting and inventory sampling, unlike A-G's direct MQTT latency.

`--services`, `--creates-per-service`, `--online-window`, `--batch-size`, `--max-connections` and `--drain` are configurable. Defaults are 1000 services, three creates and a 250-consumer window. To deliberately test full concurrency after a resource review, set both `--online-window 1000` and `--max-connections 1000`. A-G's original ceiling is unchanged. Each run persists per-service/per-message evidence without credentials; failed runs and cleanup errors produce a nonzero exit status. Cleanup disables only that run's synthetic services and removes their session resources.

Recover only the services recorded by an interrupted H run:

```sh
pnpm --filter mqtt-poc test:services --cleanup-run H-RUN-ID.json
```

The generated [benchmark report](../../docs/mqtt-poc/mqtt-poc-benchmark.md#scenario-h-service-creates-and-correlated-events) includes H success/failure rows and cleanup-recovery evidence. Small H runs are included in CI; the 1000-service experiment stays explicitly invoked.

```sh
pnpm --filter mqtt-poc typecheck
pnpm --filter mqtt-poc lint
pnpm --filter mqtt-poc format:check
pnpm --filter mqtt-poc test
pnpm --filter mqtt-poc local:stop
```

CI performs focused local checks and real-broker isolation/reliability/DX tests, not the large benchmark matrix. The added GitHub workflow has not been executed remotely in this session.

## Configuration and Limits

The broker config, server session cap, queue length/byte limits, memory watermark and DLX policy are explicit in `infra/rabbitmq.conf` and the bootstrap definitions generated by `src/setup.ts`. Edit only synthetic PoC configuration, rebuild/restart the PoC, and record changed parameters before comparing runs. Runner expiry/rate/drain/slow/offline settings are CLI options. Session cap is 1h; forwarded event expiry is 15min; queues are bounded to 1000 messages or 16MiB. These limits can intentionally expire/drop events into the internal DLQ, so QoS1 is not an unconditional end-to-end no-loss guarantee.

The JSON registry and protected local issuance material are a single-process PoC, not production IAM/secret storage. Pipeline validation errors and exhausted publish retries are internal DLQ responsibility. Errors after a subscriber PUBACK are that subscriber's responsibility. No replay, business ACK, HA, quorum, production source changes or Azure resources are included.

See [Architecture](../../docs/mqtt-poc/mqtt-poc-architecture.md), [External integration](../../docs/mqtt-poc/external-entity-integration.md), [Benchmark report](../../docs/mqtt-poc/mqtt-poc-benchmark.md), and [Assessment](../../docs/mqtt-poc/mqtt-poc-assessment.md).
