# Azure Functions characterization starter

Use this reference when the system under test is a Node.js or TypeScript Azure Functions app and the repository does not already contain a characterization harness you can follow.

This is intentionally a **starter shape**, not a full template. It should help you get from the skill's strategy guidance to a concrete set of files without adding a heavyweight framework to the skill itself.

## When to read this

Read this after you have already decided that:

- the real boundary should be the local Functions host
- the scenario is worth freezing with multilayer cassettes
- the repository does not already offer a better local harness to copy

If the repository already has a characterization setup in another Azure Functions app, prefer reusing that local convention instead of this starter.
If the user wants a Vitest **golden master / approval** suite with expensive emulators kept alive for the whole run, also read `references/persistent-golden-master-vitest.md`.

## Recommended file layout

Keep the layout close to the target app and separate reusable harness code from scenario assertions.

```text
src/
  characterization/
    <app>-happy-paths.test.ts
    cassettes/
      <scenario-name>/
        request.json
        response.json
        side-effects.json
        topology.json
        normalization.json
    support/
      cassettes.ts
      function-host.ts or app-runtime.ts
      harness.ts
```

Use different names if the repository already has a stronger testing convention, but preserve the separation:

- `*.test.ts` drives the real scenario
- `cassettes.ts` reads and writes the multilayer artifacts
- `function-host.ts` or `app-runtime.ts` owns starting or attaching to the real Functions runtime
- `harness.ts` owns Testcontainers-managed dependency containers, scenario seed data, and side-effect readers; if the app already runs in its own container, keep env and startup ownership there rather than in the harness

For Vitest-based golden master or approval suites, it is also reasonable to add:

```text
tests/
  global-setup.ts
  with-test-fixtures.ts
```

Use those files only for the approval-style shared-container pattern. The dedicated reference explains that lifecycle split in detail.

Keep the characterization folder independent from the target app's internal modules:

- do not import application models, io-ts decoders, zod schemas, generated API types, or helper functions into the characterization tests
- treat shared workspace packages, internal runtime libraries, generated clients, and published helper packages used by the function app as part of the forbidden surface too, even if they are imported by package name rather than relative path
- define any needed request builders, tiny response schemas, and side-effect serializers locally under `src/characterization/support/`
- treat OpenAPI, cassette contents, and protocol-visible payloads as the contract source instead of target-code imports

## Prefer an app container when available

If the repository already ships a Dockerfile, compose service, devcontainer task, or other containerized Functions runtime, prefer reusing that runtime shape instead of rebuilding `func start` orchestration inside the harness.

- The app container may pre-exist the test run or be started by the agent as another Testcontainer.
- In that topology, treat the function app as another runtime dependency.
- Keep env, build, and startup ownership inside the app container when it already solves those concerns credibly.
- If `docker-compose.yml` or equivalent runtime definitions already exist, use them as hints for the app container and adjacent dependencies before inventing new Testcontainers wiring. Compose definitions are source material, not the default orchestration path for the harness.
- Keep the harness focused on readiness checks, driving traffic, and reading side effects.

## Minimum workflow

1. Audit the topology before coding: list the runtime and each dependency, and note whether it will be a local stub, an app container, a Testcontainers-managed dependency, or a documented fallback. If a containerized stateful dependency is not Testcontainers-managed, stop and justify the exception first.
2. Boot only the dependencies needed for the selected scenario.
3. Start or attach to the function runtime.
4. If no credible app container exists, allocate a free local port dynamically, build the app with the repository's real build command, and start `func start --port <dynamic-port>` with the current PATH preserved.
5. Wait for readiness by calling a real local endpoint or trigger seam, not just by checking that the port is open.
6. Drive the scenario through the real local boundary.
7. Seed and read dependencies through raw SDK or protocol calls owned by the characterization folder, not through imported application model classes or shared runtime helpers.
8. Read back observable side effects from emulators or local dependencies.
9. Write `request.json`, `response.json`, `side-effects.json`, `topology.json`, and `normalization.json`.
10. In `verify` mode, rerun the scenario and compare without mutating the cassette.

If the harness is test-runner-driven, prefer doing the one-time `build` in the explicit `record` and `verify` scripts rather than inside the test body or the host wrapper. Keep the characterization test opt-in so the repository's default fast test suite does not start the full local topology by accident.
If the suite is an approval or golden-master Vitest suite and emulator startup dominates runtime, prefer the shared-container pattern from `references/persistent-golden-master-vitest.md`: start the expensive emulators once in `globalSetup`, surface their connection details to the tests, and isolate each test through builder-pattern fixtures that clean themselves up with `onCleanup`.

## Network reachability in devcontainers

When the agent itself runs inside a devcontainer, Codespace, or other shared workspace container, do not assume Docker-published dependency ports are reachable through `127.0.0.1`.

- Probe a small candidate set from the test process itself, such as `127.0.0.1`, `host.docker.internal`, the Docker bridge gateway, and an explicit override env.
- Keep the chosen host in topology metadata and normalize it in the cassette.
- Treat "container port is published" and "the harness can actually reach it" as two separate checks.
- If published ports remain unreliable, attach the workspace container to the same Docker network as the dependency containers and talk to them through network aliases; in many devcontainers this is the most stable path.

## Environment checklist

Azure Functions apps often fail before your scenario runs because required environment variables are evaluated at import time. If the repository already has an app container or compose service that owns those values, prefer reusing it instead of injecting env directly from the harness. Otherwise, before starting the host, verify all of these categories.

Treat checked-in `local.settings.json`, `.example`, or README snippets as hints, not as a guaranteed source of truth. Compare them against the real startup config module and infrastructure defaults; if they are stale or incomplete, inject a complete env map explicitly from the harness.

### Runtime settings

- `FUNCTIONS_WORKER_RUNTIME`
- `AzureWebJobsStorage`
- TLS or certificate flags required by local emulators

### Binding settings

Use the same connection names the app already declares in `app.http`, `app.storageQueue`, `app.cosmosDB`, or equivalent binding configuration.

Examples:

- queue trigger connection name
- Cosmos trigger connection string setting
- blob or table storage connection setting

### Application config settings

Check any config module that is evaluated during startup. Even if the chosen scenario does not use every dependency at runtime, startup may still require valid values for:

- topic or broker connection settings
- feature flags
- service identifiers
- storage container names
- database names

Prefer valid local values over empty placeholders so the host can boot deterministically.
Prefer syntactically valid local values, not just non-empty placeholders. Startup config often validates URLs, IDs, and connection strings at import time, so values like `example.invalid` or obviously fake URLs can still prevent the worker from loading.

## Trigger isolation for HTTP-only suites

If the selected characterization scope is one HTTP flow but the app also starts queue, blob, or timer triggers, disable the unrelated functions during capture when they would consume the emitted artifact before you can record it.

- Azure Functions supports this through `AzureWebJobs.<FunctionName>.Disabled=true`.
- This is especially useful when an HTTP request emits a queue message and the purpose of the cassette is to freeze that emitted message or downstream storage write.
- Keep the disabled-function list in `topology.json` so replay explains why the output remained observable.

## Dependency selection for Azure Functions

Pick the lightest local topology that still proves the contract.

Prefer Testcontainers-managed Azurite, Cosmos-compatible emulators, Redis, brokers, and similar dependencies. Use repository compose files or Docker definitions as discovery material, then mirror the necessary topology in Testcontainers.

| Need                                   | Preferred local dependency                                                                                                                            |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Blob, queue, or table output           | Azurite or the repository's existing storage emulator, booted through Testcontainers when it runs in a container                                      |
| Cosmos trigger or side-effect readback | Cosmos-compatible emulator or the repository's existing local Cosmos path, booted through Testcontainers when it runs in a container                  |
| HTTP dependency                        | local stub, fake, or replay server                                                                                                                    |
| Broker output                          | local broker or emulator, preferably booted through Testcontainers when it runs in a container, only if the scenario truly needs a successful publish |

If a dependency cannot run locally, document the fallback clearly and capture the closest honest boundary instead of pretending the full side effect ran.

## Readiness guidance

For Azure Functions, application-level readiness matters more than "container is listening".

Good readiness checks:

- `GET /api/v1/info` returning a success response
- a warmup query against the exact emulator collection or queue the scenario needs
- a local stub endpoint answering the exact route the function will call

Weak readiness checks:

- only waiting for a port to open
- assuming a container is ready because Docker marked it started

Put explicit timeouts around startup, readiness probes, live requests, and side-effect reads, and stream the Functions host logs while waiting. Otherwise a single hung call can turn into an opaque suite-level timeout with no useful diagnosis.

## Cosmos emulator quirks worth proving

Cosmos-compatible emulators often need more than a readiness endpoint.

- Validate the exact SDK path the app uses, not just TCP reachability.
- Some preview or Linux emulator builds advertise internal endpoints that make queries fail unless `connectionPolicy.enableEndpointDiscovery = false`.
- Prove both point-read and query behavior. Some emulators return enough metadata for direct `item.read()` but omit fields such as `_self` on query results.
- If existing shared decoders require metadata the emulator omits, do not pull those decoders into the characterization suite just for convenience. Prefer a narrow local-only seam that reads raw SDK results and normalizes them into cassette-friendly shapes inside the characterization folder instead of changing broad production behavior.

## Queue recorder note

When reading emitted messages from Azurite or another queue emulator, accept both plain JSON and base64-encoded JSON. The recorder should compare the emitted payload, not fail on transport encoding details.

## Starter snippet: cassette helper

This is the smallest useful helper shape for multilayer cassette files:

```ts
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const cassetteRoot = path.join(__dirname, "..", "cassettes");

export const sortJson = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(sortJson);
  }
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, nested]) => [key, sortJson(nested)]),
    );
  }
  return value;
};

const cassetteFile = (scenario: string, fileName: string) =>
  path.join(cassetteRoot, scenario, fileName);

export const writeScenarioCassette = async (
  scenario: string,
  layers: Record<string, unknown>,
) => {
  await Promise.all(
    Object.entries(layers).map(async ([fileName, payload]) => {
      await mkdir(path.dirname(cassetteFile(scenario, fileName)), {
        recursive: true,
      });
      await writeFile(
        cassetteFile(scenario, fileName),
        `${JSON.stringify(sortJson(payload), null, 2)}\n`,
        "utf8",
      );
    }),
  );
};

export const readScenarioLayer = async (scenario: string, fileName: string) =>
  JSON.parse(await readFile(cassetteFile(scenario, fileName), "utf8"));
```

Keep the helper boring and deterministic. It should normalize and persist data, not decide what the scenario means.

## Fallback snippet: function host wrapper

Use this only when there is no existing app container or stronger repository convention. This is the smallest useful wrapper around the real local Functions host:

```ts
import { spawn } from "node:child_process";

export class FunctionHost {
  constructor(
    private readonly cwd: string,
    private readonly env: NodeJS.ProcessEnv,
    private readonly port: number,
  ) {}

  get baseUrl() {
    return `http://127.0.0.1:${this.port}/api/`;
  }

  async start() {
    await run("pnpm", ["build"], this.cwd, this.env);
    this.child = spawn("func", ["start", "--port", String(this.port)], {
      cwd: this.cwd,
      env: this.env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    await waitUntilReady(() => fetch(new URL("v1/info", this.baseUrl)));
  }

  async stop() {
    this.child?.kill("SIGINT");
  }
}
```

The important idea is not the exact code. The important idea is:

- use the real `func start`
- preserve the current environment and PATH
- wait on a real probe
- stop the process cleanly
- keep the harness black-box even at source level; the wrapper should start the app, not import it

## What to record in `topology.json`

For Azure Functions, keep `topology.json` focused on replayable facts:

- host base URL after normalization
- app runtime identity after normalization, such as boot command, compose service, or image tag
- dependency families used, such as Azurite or Cosmos emulator
- feature flags or local-only compatibility seams that affect the scenario

Do not dump full process environments or ephemeral container internals.

## Common failure modes

### Host starts but the probe fails

Usually means one of:

- startup config is invalid
- emulator is reachable but not queryable yet
- the probe endpoint itself depends on a missing local dependency
- the probe call itself hangs because it has no timeout

Fix readiness or env wiring before recording anything.

### Happy path records a 500

Do not keep it as the "happy" cassette. Adjust the topology, seed data, or scenario selection until the response is actually success-shaped.

### Happy path records a 400

Often the harness is fine and the fixture is not. Check schema validators, documented minimum lengths, required headers, allowed recipient relationships, or other request constraints before recording the cassette.

### Emulator quirks leak into production code

Prefer a narrow local seam or non-production adapter for the capture path. Avoid changing broad shared runtime behavior just to appease an emulator.

## Decision rule

If you are blocked on file layout, use this starter.

If the repository already gives you a better pattern, especially a containerized app runtime, copy the repository pattern instead.
