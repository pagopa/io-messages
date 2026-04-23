---
name: record-replay-backend-tests
description: Create or refactor local characterization workflows for Node.js or TypeScript backends, and other backends that can credibly run as a local container, by booting the real local service, app container, or emulator, capturing cassette artifacts from real endpoint traffic, and replaying them against local services plus Testcontainers-managed stateful dependencies. Use this whenever the user wants VCR or golden-master tests, cassette generation scripts, Azure Functions emulator coverage, black-box local verification, or persisted side-effect recording for storage, Cosmos DB, Redis, queues, brokers, or similar systems, even if they only say “freeze behavior before a refactor”.
---

# Record & Replay Backend Tests

Use this skill to freeze observable backend behavior through the **real local runtime boundary**, not by importing handlers unless there is no credible local host or emulator. Prefer a real app container when the repository already has one, or when the agent can credibly create one, so the runtime owns its own environment and startup path. The goal is to let coding agents refactor framework plumbing or legacy structure while preserving what a real local client and adjacent local services can observe.

## Outcome

Produce or update:

- a **capture script or reusable test entrypoint** that starts or attaches to the local service plus the minimum dependency topology and writes multilayer cassettes
- one or more **black-box tests** that call the running local service only through its real local boundary
- any **Testcontainers or emulator setup** needed to seed dependencies, observe side effects, and persist those observations into cassette artifacts
- a short final note explaining what was frozen, how to rerun `record` vs `verify`, and where the cassette artifacts live

Read `references/dependency-strategy.md` when choosing the runtime boundary or dependency pattern.
Read `references/cassette-layout.md` before creating cassette files or recorder helpers.
If the target is a Node.js or TypeScript Azure Function and the repository does not already have a local characterization harness you can copy, read `references/azure-functions-characterization.md` before inventing a new harness shape.

If the prompt does not already define scenario scope, ask the user to clarify which scenario classes matter most before building a suite. Good examples include: happy paths only, happy paths plus selected error cases, or one specific regression branch. Do not assume a broad matrix when a smaller explicit set would do.

## Default dependency orchestration for Node.js and TypeScript

For Node.js or TypeScript characterization work, treat Testcontainers as the default orchestration layer for containerized stateful dependencies.

- Read checked-in Dockerfiles, `docker-compose.yml`, compose overrides, devcontainer tasks, and local startup scripts as topology inputs. Reuse their images, env names, ports, healthchecks, volumes, and dependency ordering, but do not treat raw `docker run` or `docker compose` orchestration as the default harness implementation just because those files exist.
- If a dependency can credibly run through Testcontainers, use Testcontainers even when that means adding `testcontainers` or an official module to the workspace.
- Only bypass Testcontainers when the user explicitly asks for another orchestration path or when you can explain a concrete blocker that makes Testcontainers not credible in the current environment.
- When you take that exception, say so plainly in the final response instead of letting it remain an implicit implementation detail.

## First inspect

1. Find the existing test runner, fixtures layout, and project conventions. Reuse them.
2. Identify the real inbound surface under test:
   - HTTP service
   - Azure Function HTTP trigger
   - queue, topic, or worker runtime
   - scheduled or event-driven process with a local trigger path
3. Identify how the service can run locally:
   - existing app container, compose service, or container image that already owns startup and env
   - Node server command
   - Azure Functions host or emulator command
   - worker command plus broker or queue emulator
   - existing `docker-compose.yml`, compose overrides, devcontainer tasks, or equivalent runtime definitions that can inform Testcontainers setup
4. Classify dependencies around that running service:
   - local HTTP dependencies that can be hosted as stub, proxy, or fake services
   - stateful data-plane dependencies that can run in Testcontainers or emulators
   - runtime-managed outputs that still have a local observable boundary
   - dependencies with no credible local execution path
5. Audit each dependency before you implement anything: note whether it will start as an app container, a Testcontainers-managed dependency, a local stub, or a documented fallback. If a Node.js or TypeScript stateful dependency will not be Testcontainers-managed, stop and justify the exception before proceeding.
6. Find contract sources: OpenAPI, schema validators, existing fixtures, known regressions, sample payloads.
7. For happy-path scenarios, identify the exact success shape up front: expected status code, minimum required body fields, and any fixture constraints that can silently turn a "happy" request into a 500.
8. Freeze nondeterminism before capturing anything: time, generated IDs, random values, volatile headers, trace metadata, environment-specific hostnames.

## Choose the system boundary

Prefer **real local runtime execution** over in-process invocation. If the repository already has a credible app container or compose service, prefer that over rebuilding startup and env wiring in the test harness.

### Node HTTP services

Start the actual local service process or app container and drive it over HTTP.

- Reuse the repository's real startup command or existing app image when possible.
- If the app container already packages env, build, and startup, keep that ownership inside the container and treat it as another topology component.
- When creating Testcontainers or app containers from scratch, use existing `docker-compose.yml` files or equivalent runtime definitions as hints for images, env names, ports, healthchecks, volumes, and dependency shape. Mirror that topology in Testcontainers when the dependency is containerized instead of shelling out to `docker compose` from the harness.
- Wait for readiness explicitly before sending requests.
- Do not default to framework-specific in-process helpers when the service can run locally.

### Azure Functions

Prefer the local Functions host or emulator and hit the real local HTTP endpoint.

- Use the same route and request shape a real local caller would use.
- If bindings or outputs can be observed through local emulators or dependency containers, capture them there.
- If the selected HTTP scenario emits queue or blob outputs that other local functions would immediately consume, disable those unrelated functions during capture so the emitted artifact stays observable.
- If the repository already exposes a containerized Functions runtime, reuse it instead of rebuilding host startup logic inside the harness.
- Use compose files, Dockerfiles, or devcontainer tasks as source material for Testcontainers wiring; do not orchestrate Azurite, Cosmos, Redis, brokers, or similar dependencies with `docker run` or `docker compose` from the harness unless you have a documented exception.
- If the workspace lacks `testcontainers`, add it rather than downgrading to bespoke Docker CLI orchestration.
- In devcontainers or repeated local runs, prefer dynamic free ports and normalize them in cassettes instead of hard-coding a fixed host port.
- In devcontainers or remote workspaces, do not assume Docker-published emulator ports are reachable through `127.0.0.1`; probe a small set of candidate hosts such as `127.0.0.1`, `host.docker.internal`, a bridge gateway, or an override env and normalize the chosen host in the cassette.
- Start the runtime in a way that preserves the current toolchain PATH; avoid brittle login-shell wrappers when spawning the local host.
- When there is no existing local characterization harness, reuse the starter layout in `references/azure-functions-characterization.md` rather than inventing a bespoke file structure from scratch.
- Fall back to direct handler invocation only when there is no credible local host or emulator path, and explain why.

### Workers, queues, topics, and event handlers

Run the worker locally, ideally as its real process or app container, and drive it through the local broker, queue, or input transport.

- Seed the broker or queue through its local API or SDK.
- Record the resulting observable outputs from downstream dependencies or emitted messages.

## Cassette model

Treat each representative scenario as a small folder of reviewable artifacts rather than a single opaque file.

Use the multilayer layout from `references/cassette-layout.md`. At minimum each scenario should record:

- canonical input
- final response or observable result
- dependency topology and relevant ports or endpoints
- side effects read back from the local dependencies
- normalization rules for unstable fields

Do not silently rewrite cassettes during verification. Refresh them only in an explicit record mode.

## Capture workflow

Start from the current implementation, not the refactor target.

1. Pick one or more representative request or message shapes from the user prompt, OpenAPI, schema examples, or existing fixtures.
2. Start the minimum dependency topology required for that scenario.
3. Start the real local service or emulator.
4. Wait for readiness.
5. Send the canonical scenario input through the real local boundary.
6. Confirm the live result matches the intended scenario class before recording it. For any scenario described as happy path, do not accept a captured 4xx or 5xx as "good enough" just because it is reproducible; fix the seed data, branch choice, or local topology first.
7. For happy-path scenarios, confirm the success shape is semantically meaningful before recording it: status code, minimum required body fields, and required side effects. Do not freeze a trivial or empty success unless that is the real contract.
8. If dependency readiness requires more than "port is open", add an application-level warmup probe before seeding or recording. Use the real SDK or API to prove the exact read or write path you need is actually usable.
9. Record:
   - request shape after normalization
   - response status, headers, and body
   - relevant runtime metadata
   - persisted side effects read back from dependencies
10. Save the multilayer cassette artifacts deterministically.
11. Run verify mode once after the first successful record and inspect cassette contents directly for accidental error responses, unstable metadata, or other success-shape violations.
12. Switch the workflow into replay or verify mode so future runs fail on drift instead of silently re-recording.

## Capture script guidance

Generate a reusable script or CLI entrypoint when the repository does not already have one.

The script should:

1. boot dependencies first
2. start or attach to the target service
3. wait for readiness
4. send one or more canonical inputs
5. collect the response and side-effect observations
6. write cassette artifacts
7. tear down the topology cleanly

Prefer two explicit modes:

- `record`: intentionally refresh cassette artifacts
- `verify`: replay the scenario and compare the live observations against the stored cassette without mutating it

If the project already has scripts for local bootstrapping or fixture seeding, extend them instead of inventing parallel tooling.

If the repository already has an app container, compose service, or image that brings the service up with the correct env, prefer using that runtime as another topology component instead of reconstructing env injection inside the harness.
If the repository already has `docker-compose.yml` or equivalent runtime descriptors, use them as a source of truth for container topology before inventing new container shapes, then express the needed dependencies through Testcontainers instead of invoking compose from the harness when Testcontainers is credible.

## Dependency strategy

### Local HTTP dependencies

When the service under test calls another HTTP service, prefer a **local stub, fake, or proxy service** inside the test topology.

- Start it locally or in a container.
- Make it deterministic.
- Capture the requests it receives and the responses it returns as part of the scenario cassette.
- Keep the recording at the protocol boundary, not at internal helper-call level.

If a real dependency cannot run locally, prefer recording once and replaying through a local stub server rather than keeping the dependency live during verification.

### Stateful dependencies

Prefer Testcontainers or local emulators for storage, databases, caches, and brokers.

- Prefer official Testcontainers modules when they exist for the target dependency. Fall back to lower-level container wiring only when there is no credible official module path.
- For Node.js or TypeScript harnesses, this is the default path, not a soft preference.
- Use compose files, Dockerfiles, and existing runtime definitions as discovery inputs for Testcontainers wiring, not as a reason to replace Testcontainers with shell-based Docker orchestration.
- If `testcontainers` is missing from the workspace and the dependency can credibly run that way, add it instead of avoiding Testcontainers to save one dependency change.
- Do not replace Testcontainers with ad hoc `docker run` or `docker compose` commands just because they are faster to type; treat raw Docker orchestration as an exception that needs a concrete justification or explicit user request.
- Before forcing a container platform like `linux/amd64`, inspect the image manifest and the current host architecture. If the official image already publishes a native `arm64` variant, prefer the native platform; cross-architecture emulation can make a dependency look partially alive while an internal subsystem still crashes or never becomes queryable.
- Point production config at the local dependency through the same env path the service already uses.
- Seed only the minimum prerequisite state.
- After the scenario runs, read back the real side effect and persist it into the cassette.
- If the dependency uses a preview or "vnext" emulator image, treat compatibility as something to prove, not assume: document the exact image tag and validate that the chosen happy-path queries and writes actually succeed on that emulator.
- For Cosmos-compatible emulators, prove both point-read and query paths with the real SDK. Some preview emulators require endpoint discovery to be disabled or omit metadata on query results; keep any workaround local to the characterization path.
- If the emulator exposes quirks that do not belong in production behavior, prefer a local-only compatibility adapter or seam gated by non-production config instead of mutating widely shared runtime models globally.

Examples of side-effect records:

- storage: payload bytes or text plus relevant metadata
- Cosmos or document DB: resulting documents or filtered query result
- Redis: key, value, TTL, stream entry, or pub-sub payload
- broker or queue: received message body and stable headers

### Runtime-managed outputs

Prefer a local runtime or emulator that makes the emitted artifact observable.

- If the runtime writes to Azurite, a queue emulator, or a local broker, record the effect there.
- If the recorder reads from a queue emulator, decode the message exactly as the emulator stores it before comparing it; some expose JSON as base64-wrapped text rather than plain JSON.
- If no credible local observation point exists, capture the closest local boundary the runtime hands off, and explain that exception clearly.

### Mixed systems

Many scenarios combine all three:

- local request to the running service
- local dependency topology in Testcontainers or emulators
- side-effect recorders that persist observations into cassette artifacts

That is the normal target shape for this skill.

## Black-box verification tests

Write tests that remain independent from the implementation internals.

- Call only the running local service, host, or worker boundary.
- Reuse the cassette scenario as the contract source.
- Compare live responses and persisted side effects against the stored cassette.
- Keep assertions at the external contract level, including minimum contract meaning for happy paths.
- Do not overfit to helper calls, SDK call counts, or imported handler details when the real contract is the observed system behavior.

If the refactor changes only framework plumbing, the capture script and scenario tests should stay the same or need only minimal boot-command updates.

## What to freeze

Freeze what another local system or client can observe:

- HTTP request and response contract
- queue or topic input and output payloads
- documents, blobs, cache entries, or messages that now exist in the local dependency
- normalized dependency interactions captured by local stub or proxy services
- topology details that matter for replay

Do not freeze irrelevant noise:

- trace IDs
- timestamps unless semantically meaningful
- host-specific port assignments that can be normalized
- framework-specific header ordering
- incidental helper-call counts

## Guardrails

- Prefer black-box local execution over in-process imports.
- Prefer real local hosts, emulators, and local dependency topologies over direct handler invocation.
- Prefer an existing app container or compose service when it already owns the runtime env and startup path.
- For Node.js or TypeScript harnesses, do not orchestrate containerized stateful dependencies with `docker run` or `docker compose` from the harness when Testcontainers is feasible.
- Keep cassette artifacts small, reviewable, and split by concern.
- Redact secrets before persisting any cassette layer.
- Refresh cassettes only in explicit record mode.
- Prefer reusable container-side recorder helpers over one-off inline assertions.
- For happy-path suites, fail fast on any success scenario that records a server error instead of preserving the failure as a cassette.
- For happy-path suites, do not freeze semantically empty or trivial successes as the main contract unless that is genuinely the behavior worth protecting.
- Normalize database/cache metadata such as `_etag`, `_rid`, `_self`, `_ts`, dynamic port numbers, and runtime-generated resource names before persisting side effects.
- Keep normalization rules shared between `record` and `verify`; the cassette should describe them, not be their only implementation.
- When topology details matter, pin and record relevant runtime or emulator image tags and versions.
- Keep emulator compatibility logic local to the capture path when possible; avoid baking emulator-only behavior into shared production models unless there is no narrower seam.
- Do not force cross-architecture container execution unless the image lacks a native build or you have already proved the native variant is unusable in this environment.
- If you take a non-Testcontainers exception for a Node.js or TypeScript stateful dependency, justify it explicitly instead of letting it disappear into the harness implementation.
- If a dependency cannot run locally, explain the fallback and keep it as close as possible to a real observable contract boundary.

## Final response

When you finish, briefly state:

- which local runtime boundary was exercised
- which files were added or changed
- where the cassette artifacts are stored
- which dependencies were recorded through local stubs, Testcontainers-managed containers or emulators, app containers, or fallback seams
- whether any containerized dependency did not use Testcontainers and, if so, why that exception was necessary
- how to rerun `record` and `verify`

## Examples

**Example 1**
Input: "Freeze this Express endpoint before I port it to Hono. It calls two REST partners and writes to Cosmos."
Output shape: "Add a capture script that boots the Express service plus local partner stubs and Cosmos-compatible storage, writes multilayer cassettes for representative scenarios, then add black-box verification tests that hit the running local HTTP service and compare both response data and stored documents against the cassette."

**Example 2**
Input: "Create refactor-safety coverage for this Azure Function. I want the real local Functions runtime, not direct handler calls. It hits a REST API and emits a message."
Output shape: "Start the local Functions runtime, preferably through the existing app container if one already owns env and host startup, drive the HTTP trigger through its real local endpoint, run the REST dependency as a local stub or replay server, capture the emitted message through the local observable dependency or emulator, and persist request, response, topology, and side-effects cassette layers."

**Example 3**
Input: "I need VCR-style tests for this Fastify app, but the tests must call the app as a running local service and also remember Redis side effects."
Output shape: "Generate a capture script that boots Fastify plus Redis in Testcontainers, records canonical requests against the running local server, saves the response contract and Redis state in multilayer cassettes, then adds verify-mode tests that rerun the same scenario against the local service without rewriting the cassette."
