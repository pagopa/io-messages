---
name: integration-backend-tests
description: Create or refactor integration tests for Node.js or TypeScript backends using real local runtimes, Testcontainers-managed dependencies, emulators, and persistent Vitest lifecycles. Use this whenever the user asks for integration tests, real-service contract coverage across domain, adapters, infrastructure, persistence, or runtime boundaries, wants emulator reuse across a suite or watch mode, or wants to turn mock-heavy unit tests into a smaller number of live integration tests. Prefer this skill over record-replay or golden-master workflows when the goal is ongoing integration coverage rather than cassettes, approval snapshots, or frozen behavior. When both skills are relevant, let this skill own the shared Vitest/Testcontainers harness and let record-replay layer cassette-specific workflows on top of it instead of creating a second harness.
---

# Integration Backend Tests

Use this skill to add integration tests that exercise real contracts through honest local boundaries. Default to the **full local runtime boundary** when the service, Functions host, or worker can credibly run locally. Drop to a smaller in-process integration slice only when that is the honest seam for the contract or when the runtime boundary would add noise without adding signal.

The point is to verify the glue that unit tests erase: routing, serialization, DI wiring, adapter behavior, persistence mapping, broker or storage integration, and runtime configuration. Keep mocks out of the critical path.

## Outcome

Produce or update:

- a focused integration suite that exercises a real local runtime or an honest multi-layer slice
- any shared `global-setup.ts`, `withTestFixtures`, `support/` helpers, or runtime wrappers needed to share expensive dependencies across the suite, reusing or consolidating an existing live-test harness when one already exists
- local stub or fake services for outbound HTTP dependencies when the real third-party system is not supposed to be part of the test
- Testcontainers or emulator wiring, seed helpers, and read-back helpers for stateful side effects
- opt-in commands such as `test:integration`, `integration:watch`, or the repository's equivalent
- a short final note explaining the chosen boundary, real dependencies used, and how to rerun the suite

Read `references/boundary-selection.md` when the right seam is not obvious.
Read `references/persistent-vitest-integration.md` before choosing any Vitest lifecycle.
Read `references/promoting-unit-tests.md` when the starting point is a dense mock-heavy unit suite.
If the target is a Node.js or TypeScript Azure Functions app and the repo lacks a stronger local harness, read `references/azure-functions-live-integration.md`.

If the prompt does not already narrow the scope, ask which scenario classes matter most. A small, honest suite beats a giant matrix that nobody reruns.

## When record-replay is also relevant

These skills can coexist, but the shared harness should stay singular.

- Let this skill own the reusable live-runtime foundation for the boundary both suites exercise: `globalSetup`, shared Testcontainers startup, provided connection metadata, and generic fixture plumbing.
- Let `record-replay-backend-tests` own cassette capture or replay commands, normalization, approval assertions, and characterization-only support code layered on top of that foundation.
- Reuse and consolidate an existing characterization or integration harness before inventing a parallel `global-setup.ts` or duplicate container bootstrap path.
- If the suites truly need different include patterns, reporters, or lifecycle rules, use separate Vitest projects or configs that still import the same shared test-only container helpers instead of starting the same dependencies twice.
- Do not solve coexistence by generating two competing `global-setup.ts` files for the same suite root.

## Core workflow

1. Inspect the repository's current test runner, startup path, nearby unit or integration tests, and any existing characterization harness.
2. Identify the contract the user wants to protect, then choose the smallest **honest** boundary for that contract. Default to the full runtime when it is credible and relevant.
3. Inventory the dependencies and classify them as:
   - real local runtime or app container
   - Testcontainers-managed or emulator-backed stateful dependency
   - deterministic local HTTP stub, fake, or proxy
   - documented fallback when no credible local path exists
4. Mine existing unit tests for high-value scenarios, payloads, fixtures, and edge cases; do not port them one-for-one.
5. Boot the minimum local topology needed for those scenarios. For Node.js or TypeScript stateful dependencies, use Testcontainers by default.
6. If Vitest is available, keep expensive dependencies shared across the run with `globalSetup` and isolate mutable state with per-test fixtures, reusing an existing live-test harness when record-replay or approval suites already cover the same boundary.
7. Write tests that drive the chosen boundary and assert on observable contract and side effects, not on helper calls or mock usage.
8. Add or update the smallest set of commands needed to run and watch the suite.
9. Explain any exception plainly, especially when you avoid Testcontainers or choose a narrower slice than the runtime boundary.

## Boundary choice

Prefer **real local runtime execution** when the contract lives there:

- HTTP routes, middleware, auth, serialization, status codes, and headers
- Azure Functions triggers, bindings, and host wiring
- workers, broker consumers, and scheduler entrypoints
- runtime configuration or DI wiring issues that unit tests hide

Choose a smaller multi-layer integration slice only when that is the honest seam:

- repository or adapter plus real database or storage
- real HTTP client adapter plus deterministic local stub
- use case plus real adapters or persistence when the runtime boundary would only add irrelevant framework noise
- dense edge-case matrices where one runtime happy path plus a narrower slice gives better coverage than many host-level tests

Read `references/boundary-selection.md` for the decision matrix and examples.

## Default dependency orchestration for Node.js and TypeScript

Treat Testcontainers as the default orchestration layer for containerized stateful dependencies.

- Read checked-in Dockerfiles, compose files, devcontainer tasks, and local scripts as topology inputs.
- Reuse their images, env names, healthchecks, ports, volumes, and dependency ordering.
- Do not replace Testcontainers with ad hoc `docker run` or `docker compose` commands just because they are quicker to type.
- If `testcontainers` is missing and the dependency can credibly run that way, add it.
- Only bypass Testcontainers when the user explicitly asks for another orchestration path or there is a concrete blocker you can explain.
- Before forcing a container platform like `linux/amd64`, inspect the image manifest and host architecture. Prefer a native image when it exists.

## Reuse existing unit tests without copying their shape

Treat unit tests as scenario discovery material, not as the integration suite itself.

Keep from them:

- canonical request bodies, params, and event payloads
- domain invariants that should still hold when the real system runs
- important error branches worth paying integration cost for
- side effects that matter to callers or downstream systems

Usually drop or rewrite:

- mock call counts
- private helper expectations
- implementation-shaped assertions that disappear behind the real boundary
- factory utilities whose main job is to keep mocked collaborators alive

Read `references/promoting-unit-tests.md` when the repository already has a deep unit suite around the feature.

## Assertion style

Assert on what the chosen boundary actually promises:

- HTTP status, headers, and body shape
- outbound requests observed by a local stub
- documents, blobs, rows, queue messages, cache keys, or broker events read back from the real local dependency
- resource naming, TTLs, or partition keys when they are semantically part of the contract
- meaningful failure modes at the boundary

Avoid pretending a unit test is integration coverage:

- do not mock the storage, broker, or HTTP dependency you claim to be integrating with
- do not assert spy counts when you can read back the side effect
- do not keep old unit-test arbitraries or factories if they obscure the real request, response, or seed data
- do not carry over every tiny unit branch; integration tests should be fewer, slower, and more valuable

## Import policy

Keep the suite honest, not dogmatic.

- If the chosen boundary is the real runtime, prefer driving it through HTTP, the Functions host, worker transport, or the closest real local entrypoint.
- If the chosen boundary is a smaller multi-layer slice, it is fine to import the real classes or factories under test.
- Avoid importing mock factories, fake clients, or helper utilities whose main purpose is to preserve the old unit-test shape.
- Prefer local seed and read-back helpers when they make the contract clearer than reusing test-only utilities from other suites.
- Reusing production-owned schemas or types is acceptable only when they describe the real contract rather than leaking internal implementation detail into the test.

## Vitest lifecycle

Whenever the repository already uses Vitest, or can credibly support a Vitest-based integration harness, treat a **shared-container lifecycle** as the default.

Keep these lifecycles separate:

- **shared dependencies**: boot Azurite, Cosmos, Redis, Postgres, brokers, and similar services once in `globalSetup`
- **per-test fixtures**: create disposable containers, key namespaces, queues, blob prefixes, schemas, or documents per test and clean them automatically
- **runtime process**: keep the app or local Functions host restartable when code changes need a fresh process

Read `references/persistent-vitest-integration.md` before wiring this. The point is not just speed. Reusing the expensive dependencies across the whole process keeps watch reruns fast while per-test cleanup keeps the results trustworthy.
When approval or record-replay suites also exist, keep the shared-container layer singular: reuse the same `globalSetup` or shared container-startup helpers for the same boundary, then let each suite add only its own fixtures, commands, and assertions.

## Local HTTP dependencies

When the system under test calls partner HTTP services, prefer a **deterministic local stub, fake, or proxy** inside the test topology.

- Start it locally or in a container.
- Make its contract explicit.
- Assert on the request it received or the response the system produced because of it.
- Keep the seam at the protocol boundary instead of spying on an SDK wrapper.

## Azure Functions

For Node.js or TypeScript Azure Functions, default to the real local Functions host when the contract is exposed through triggers, routes, bindings, or emitted side effects.

- Reuse an existing characterization or integration harness in the repo before inventing a new one.
- Prefer an existing app container when it already owns env and startup credibly.
- Use Testcontainers or emulators for Azurite, Cosmos-compatible emulators, Redis, brokers, and similar dependencies.
- Prove readiness at the level the scenario actually needs: live endpoint, queue path, write plus query warmup, not just "port is open".
- Disable unrelated triggers when they would consume the emitted artifact you need to assert on.

Read `references/azure-functions-live-integration.md` for the Azure Functions-specific workflow and devcontainer or network checklist.

## Guardrails

- Prefer real local hosts and real local dependencies over mocks.
- Prefer a smaller honest topology over a theatrical full stack that does not add signal.
- Keep the suite opt-in if running it requires expensive local services.
- Build once in the explicit integration test command rather than inside every test body.
- Keep cleanup inside fixtures when the local Vitest version does not provide `onCleanup`.
- Seed only the minimum data the scenario needs, then read back the real side effect after the call.
- Fail fast when a supposed happy-path integration scenario only passes because the test asserted too little.
- When record-replay or approval suites coexist, do not fork the shared Vitest or Testcontainers harness unless you can explain a concrete lifecycle mismatch.
- Explain any fallback: no credible local runtime, no Testcontainers path, or a choice to use a smaller slice instead of the runtime boundary.

## Final response

When you finish, briefly state:

- which boundary the tests exercise
- which files were added or changed
- which real local dependencies or stubs the suite uses
- how shared containers and per-test fixtures are handled
- how to rerun the suite

## Examples

**Example 1**
Input: "Turn these mocked Redis adapter tests into integration tests and keep Redis alive for the whole Vitest session."
Output shape: "Add a Vitest `global-setup.ts` that boots Redis once, a `withTestFixtures` helper that allocates disposable key namespaces, and integration tests that call the real adapter and read back keys or TTLs instead of asserting mocked client calls."

**Example 2**
Input: "I want integration coverage for this Azure Function using the real local host, Azurite, and Cosmos Emulator, but no golden master cassettes."
Output shape: "Boot Azurite and the Cosmos emulator through Testcontainers, start the real local Functions host, seed only the prerequisite data, drive the HTTP trigger through its local route, then assert on the response and read-back side effects from the emulator."

**Example 3**
Input: "These `__tests__` around the use case and handler are all mocked. Promote them to a smaller number of integration tests with a local partner API stub and real Postgres."
Output shape: "Extract the high-value scenarios from the unit tests, replace the mocked partner client with a deterministic local stub server, boot Postgres through Testcontainers, then add runtime or slice-level integration tests that prove the real serialization, persistence, and error mapping."

**Example 4**
Input: "Keep the full HTTP boundary for one happy path, but use a narrower adapter-plus-persistence slice for the error matrix so the suite stays fast."
Output shape: "Split the suite intentionally: one host-level integration test for end-to-end wiring, plus a smaller multi-layer slice with real dependencies for the dense branch coverage, all using the same shared container lifecycle."
