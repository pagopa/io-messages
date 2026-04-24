# Dependency strategy matrix

Use this reference when deciding how to boot the local system under test, how to capture behavior, and where to observe side effects.

## Inbound surface

| Surface                                     | Preferred driver                                                                                                   | Why                                                                                    |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------- |
| Hono / Express / Fastify / similar HTTP app | start the real local server process or app container and call it over HTTP                                         | keeps the test black-box and stable across framework refactors                         |
| Azure Function HTTP trigger                 | start the local Functions host, emulator, or app container and call the real local endpoint                        | exercises the route, host wiring, and runtime behavior that a local caller would see   |
| queue / topic / worker runtime              | start the real local worker process or app container plus local broker or emulator, then publish the input message | keeps the contract at the transport boundary instead of at imported handler boundaries |
| scheduled or event-driven process           | run the real local runtime or app container and trigger it through the scheduler or closest local trigger seam     | preserves the deployed execution path when a local runtime exists                      |

Only fall back to direct handler invocation when no credible local host, emulator, or worker runtime exists. If you do, explain why the fallback is necessary.

## Dependency type

| Dependency type                                       | Preferred technique                                                | Record at this boundary                                                                   | Avoid                                                                              |
| ----------------------------------------------------- | ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| partner REST or HTTP service                          | local stub, fake, or proxy service in the test topology            | request received by the local dependency plus response returned to the service under test | live third-party traffic during verification                                       |
| SDK wrapping an HTTP service contract                 | local stub or replay server that speaks the same protocol          | normalized request/response exchange captured by the local dependency                     | asserting only SDK method calls                                                    |
| Blob / object storage                                 | Testcontainers or emulator plus recorder helper                    | downloaded payload plus relevant metadata persisted into `side-effects.json`              | asserting only upload call arguments                                               |
| Cosmos / document store                               | local compatible database or emulator plus recorder query          | resulting document set or filtered query result in `side-effects.json`                    | asserting only insert or update function inputs                                    |
| Redis / cache                                         | local Redis container plus recorder helper                         | key, value, TTL, stream entry, or pub-sub payload                                         | spying on the Redis client instead of reading the store                            |
| queue / broker                                        | local broker or emulator plus consumer-side recorder               | emitted message body and stable headers in `side-effects.json`                            | asserting only that a publish method was called                                    |
| runtime-managed output with local observation path    | use the local runtime plus the dependency it writes to             | the effect as observed in the local dependency or emulator                                | sniffing internal runtime handoff objects when the effect is externally observable |
| runtime-managed output without local observation path | capture the closest local handoff seam and document the limitation | serialized payload at the last local observable boundary                                  | pretending the side effect was fully exercised locally when it was not             |

## Topology guidance

Prefer the lightest topology that still proves the contract:

- start only the service under test and the dependencies required for the selected scenario
- prefer reusing an existing app container, compose service definition, or image when the repository already has one
- if the app container already packages env, build, and startup, keep that ownership inside the container rather than recreating it in the harness
- when creating Testcontainers or app containers, inspect existing `docker-compose.yml`, compose overrides, devcontainer tasks, or equivalent runtime files for images, env names, ports, healthchecks, volumes, and dependency ordering
- treat compose files as a source of truth for topology, not as the default orchestration mechanism for the characterization harness
- instantiate containerized stateful dependencies with Testcontainers by default even when the repository already has compose definitions
- if the needed Testcontainers package is missing, add it rather than replacing it with shell-based Docker orchestration
- before implementation, audit each dependency and record whether it will be a local stub, an app container, a Testcontainers-managed dependency, or a documented fallback; stop if astateful dependency lacks a justified Testcontainers path
- wire the topology through the same env vars or config paths that production code already uses
- persist enough topology metadata for replay: service base URL, dependency endpoints, ports, enabled feature flags, and relevant image tags or runtime versions
- prefer official Testcontainers modules over hand-rolled GenericContainer bootstraps when the module exists
- inspect the container image manifest before pinning a platform; if the image already ships a native host architecture variant, prefer that over forced cross-arch emulation
- if an emulator uses preview or vnext images, pin and document the exact image tag used during capture
- for preview or vnext emulators, pair transport-level readiness with an application-level warmup probe that exercises the real SDK or API path you need before seeding data
- in devcontainers or remote workspaces, prove how the test process reaches Docker-published emulator ports; do not hard-code `127.0.0.1` when `host.docker.internal`, the bridge gateway, or an explicit override env is the only reachable path
- if host-published ports are still inconsistent from the harness process, attach the workspace container to the same Docker network as the dependency containers and use network aliases there; keep the chosen reachability path in topology metadata
- for Cosmos or document-store emulators, prove both point-read and query behavior with the real SDK; some preview emulators need endpoint discovery disabled or omit metadata on query results
- if a preview emulator omits query metadata that shared production decoders expect, prefer a narrow characterization-only adapter or model factory instead of loosening shared decoding rules globally
- for Azure Functions suites scoped to one HTTP flow, disable unrelated local triggers when they would consume the very queue/blob side effect you intend to record
- for local hosts that may be run repeatedly inside a devcontainer, prefer dynamic free ports and normalize them in cassette artifacts
- normalize environment-specific values before writing them into cassette artifacts
- keep emulator-only compatibility fixes in a narrow local adapter or seam when possible instead of rewriting shared production-facing models globally
- keep recorder and seed helpers independent from target application modules; prefer raw SDK calls, plain JSON payloads, and local characterization schemas over importing app-owned models or decoders

## Container-side recorder pattern

Use reusable recorder helpers rather than ad hoc assertions. Each recorder should:

1. know how to seed the dependency if the scenario needs prerequisites
2. read back the resulting side effect after the scenario runs
3. serialize a deterministic snapshot for the cassette
4. expose a compare function for verify mode

These helpers should belong to the characterization folder, not to the target application's runtime modules. Avoid importing production model classes, validators, or serialization helpers into them unless there is no credible contract-local alternative and you document that exception.

Examples:

- storage recorder -> `downloadObject()` then persist body plus metadata
- Cosmos recorder -> `queryDocuments()` with a stable predicate and persist sorted results
- Redis recorder -> `get`, `ttl`, `xrange`, or `subscribe` depending on the contract
- broker recorder -> receive one message, decode emulator-added transport envelopes such as base64-wrapped JSON when needed, normalize headers, persist the payload

## Replay safety checklist

Before saving cassette layers, normalize or remove values that will create noisy diffs:

- timestamps and generated dates
- request IDs and correlation IDs
- trace headers
- auth tokens or signed URLs
- hostnames and ports that can change between runs
- container IDs or ephemeral resource names
- database and cache metadata such as `_etag`, `_rid`, `_self`, `_ts`
- runtime-generated database names, container names, or temporary topology identifiers

Keep the normalization rules explicit and persist them alongside the scenario so `verify` mode applies the same logic.
