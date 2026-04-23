# Azure Functions characterization starter

Use this reference when the system under test is a Node.js or TypeScript Azure Functions app and the repository does not already contain a characterization harness you can follow.

This is intentionally a **starter shape**, not a full template. It should help you get from the skill's strategy guidance to a concrete set of files without adding a heavyweight framework to the skill itself.

## When to read this

Read this after you have already decided that:

- the real boundary should be the local Functions host
- the scenario is worth freezing with multilayer cassettes
- the repository does not already offer a better local harness to copy

If the repository already has a characterization setup in another Azure Functions app, prefer reusing that local convention instead of this starter.

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
- `harness.ts` owns dependency containers, scenario seed data, and side-effect readers; if the app already runs in its own container, keep env and startup ownership there rather than in the harness

## Prefer an app container when available

If the repository already ships a Dockerfile, compose service, devcontainer task, or other containerized Functions runtime, prefer reusing that runtime shape instead of rebuilding `func start` orchestration inside the harness.

- The app container may pre-exist the test run or be started by the agent as another Testcontainer.
- In that topology, treat the function app as another runtime dependency.
- Keep env, build, and startup ownership inside the app container when it already solves those concerns credibly.
- If `docker-compose.yml` or equivalent runtime definitions already exist, use them as hints for the app container and adjacent dependencies before inventing new Testcontainers wiring.
- Keep the harness focused on readiness checks, driving traffic, and reading side effects.

## Minimum workflow

1. Boot only the dependencies needed for the selected scenario.
2. Start or attach to the function runtime.
3. If no credible app container exists, allocate a free local port dynamically, build the app with the repository's real build command, and start `func start --port <dynamic-port>` with the current PATH preserved.
4. Wait for readiness by calling a real local endpoint or trigger seam, not just by checking that the port is open.
5. Drive the scenario through the real local boundary.
6. Read back observable side effects from emulators or local dependencies.
7. Write `request.json`, `response.json`, `side-effects.json`, `topology.json`, and `normalization.json`.
8. In `verify` mode, rerun the scenario and compare without mutating the cassette.

## Environment checklist

Azure Functions apps often fail before your scenario runs because required environment variables are evaluated at import time. If the repository already has an app container or compose service that owns those values, prefer reusing it instead of injecting env directly from the harness. Otherwise, before starting the host, verify all of these categories:

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

## Dependency selection for Azure Functions

Pick the lightest local topology that still proves the contract.

| Need | Preferred local dependency |
| --- | --- |
| Blob, queue, or table output | Azurite or the repository's existing storage emulator |
| Cosmos trigger or side-effect readback | Cosmos-compatible emulator or the repository's existing local Cosmos path |
| HTTP dependency | local stub, fake, or replay server |
| Broker output | local broker or emulator only if the scenario truly needs a successful publish |

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

Fix readiness or env wiring before recording anything.

### Happy path records a 500

Do not keep it as the "happy" cassette. Adjust the topology, seed data, or scenario selection until the response is actually success-shaped.

### Emulator quirks leak into production code

Prefer a narrow local seam or non-production adapter for the capture path. Avoid changing broad shared runtime behavior just to appease an emulator.

## Decision rule

If you are blocked on file layout, use this starter.

If the repository already gives you a better pattern, especially a containerized app runtime, copy the repository pattern instead.
