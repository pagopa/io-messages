# Azure Functions live integration starter

Use this reference when the system under test is a Node.js or TypeScript Azure Functions app and the repository does not already contain a stronger local integration harness you can copy.

This is a starter shape, not a rigid template. If the repo already has a characterization or integration setup in another Function app, reuse that local convention first.

## When to read this

Read this after you have already decided that:

- the honest boundary is the local Functions host
- the scenario is worth exercising as a live integration test
- the repository does not already offer a better harness to follow

## Recommended layout

Keep the integration folder close to the target app and separate runtime helpers from scenario assertions.

```text
src/
  integration/
    approval-or-live/
      <scenario>.test.ts
    support/
      function-host.ts
      harness.ts
      stubs.ts
      cleanup.ts
```

If the repo already has a `characterization/` or `integration/` folder, keep that naming. The important part is the separation:

- `*.test.ts` drives the real scenario
- `function-host.ts` or `app-runtime.ts` owns starting or attaching to the real Functions runtime
- `harness.ts` owns Testcontainers-managed dependencies, seed data, and read-back helpers
- `stubs.ts` owns any outbound partner HTTP stubs

For Vitest-based suites, also consider:

```text
tests/
  global-setup.ts
  with-test-fixtures.ts
```

Use those files for the shared-container lifecycle when the repo already uses Vitest.

## Minimum workflow

1. Audit the topology before coding: runtime, storage, Cosmos, Redis, brokers, partner APIs, and which ones will be real, stubbed, or documented fallbacks.
2. Boot only the dependencies needed for the selected scenario.
3. Start or attach to the real local Functions runtime.
4. If no credible app container exists, allocate a free local port dynamically, build the app with the repo's real build command, and start `func start --port <dynamic-port>` with the current PATH preserved.
5. Wait for readiness by calling a real local endpoint or trigger seam, not just by checking that the port is open.
6. Drive the scenario through the real local boundary.
7. Seed and read dependencies through raw SDK or protocol calls owned by the integration folder, not through mock helpers.
8. Assert on the response and the side effects that matter to the contract.

If the harness is test-runner-driven, prefer doing the one-time `build` in the explicit integration test command rather than inside every test body.

## Prefer an app container when available

If the repository already ships a Dockerfile, compose service, devcontainer task, or other containerized Functions runtime, prefer reusing that runtime shape instead of rebuilding `func start` orchestration in the harness.

- Treat the function app as another runtime component.
- Keep env, build, and startup ownership inside the app container when it already solves those concerns credibly.
- Use compose files or Dockerfiles as topology hints, not as a reason to shell out to `docker compose` from the harness.

## Environment checklist

Azure Functions apps often fail before your scenario runs because required environment variables are evaluated at import time.

Before starting the host, verify categories like:

- `FUNCTIONS_WORKER_RUNTIME`
- `AzureWebJobsStorage`
- TLS or certificate flags needed by local emulators
- binding connection names used by the app
- application config settings validated during startup, such as URLs, service IDs, storage names, broker settings, and feature flags

Prefer syntactically valid local values, not just non-empty placeholders.

## Trigger isolation for HTTP-focused suites

If the selected integration scope is one HTTP flow but the app also starts queue, blob, or timer triggers, disable the unrelated functions when they would consume the emitted artifact you want to assert on.

Azure Functions supports this through `AzureWebJobs.<FunctionName>.Disabled=true`.

That is especially useful when:

- an HTTP request emits a queue message you want to inspect
- a blob or queue output would be consumed immediately by another local trigger

## Devcontainer and network guidance

When the harness runs inside a devcontainer, Codespace, or shared workspace container, do not assume Docker-published dependency ports are reachable through `127.0.0.1`.

- Probe a small candidate set from the test process itself, such as `127.0.0.1`, `host.docker.internal`, the Docker bridge gateway, and an explicit override env.
- Keep the chosen host path explicit in the setup code.
- Treat "container port is published" and "the harness can actually reach it" as separate checks.
- If Testcontainers inherits a Docker config that points at an unavailable credential helper, set `DOCKER_CONFIG` to a minimal writable directory **before** the Node or Vitest process starts.

## Cosmos emulator guidance

Cosmos-compatible emulators often need more than a listening port check.

- Validate the exact SDK path the app uses, not just TCP reachability.
- Do not stop at account metadata like `getDatabaseAccount()` when the scenario needs container-level writes or queries.
- Warm the exact database and container path with a real write plus query or readback, then clean the probe data back out.
- Some emulator builds require endpoint discovery to be disabled for stable queries.

## Queue and blob side effects

When the Function writes to queues, blobs, or tables through Azurite or another emulator:

- read the emitted artifact from the emulator rather than spying on internal helper calls
- accept the transport encoding the emulator actually uses
- assert on the payload that a downstream system would care about

## Good final shape

A good Azure Functions live integration suite usually has:

- one explicit way to boot the host
- shared emulator containers when Vitest is available
- per-test disposable resources
- local partner HTTP stubs where needed
- assertions on the real response and real side effects

That gives you integration confidence without turning the suite into a golden-master or record-replay harness by accident.
