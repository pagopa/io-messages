# Persistent Testcontainers for Vitest golden master suites

Use this reference whenever the characterization suite runs on **Vitest**, especially when slow dependencies such as Cosmos DB Emulator, Azurite, Service Bus emulators, Event Hubs emulators, Redis, or Postgres dominate runtime. This is the default Vitest lifecycle for the skill, not an optional optimization to remember only when someone complains about watch performance.

This pattern is the starting point for Vitest-based characterization work because it gives deterministic per-test state without paying container bootstrap cost on every rerun. Do not drop back to ephemeral `beforeAll` / `afterAll` container startup in Vitest just because it is faster to wire; only do that when the user explicitly asks for ephemeral containers. If the repository genuinely blocks this pattern, explain that blocker instead of silently downgrading.

## Core idea

Split the lifecycle in two:

1. **Containers live for the whole Vitest run**
   - start them once in `globalSetup`
   - print the connection details the tests need
   - keep them alive across the suite and watch reruns
   - stop them once in teardown
2. **Fixture data lives only for one test**
   - create disposable resources lazily when a test needs them
   - delete those resources automatically after the test
   - never rely on "shared container means shared mutable data"

If the suite leaves fixture data behind, the next test or watch rerun can see it and the golden master stops being trustworthy.

## Default assumption

When Vitest is available, assume all expensive stateful dependencies belong in shared `globalSetup` unless the user explicitly says they want ephemeral containers for each run.

- keep Azurite, Cosmos Emulator, Redis, and similar dependencies alive for the whole Vitest process
- keep mutable fixture state disposable and test-scoped
- keep any restartable app process separate from the shared dependency container lifecycle when code changes need a fresh runtime
- if you cannot make this work, stop and explain why instead of quietly moving container startup into `beforeAll`

## Recommended file layout

Adjust names to the repository's conventions, but keep the separation of concerns:

```text
vitest.config.ts
tests/
  global-setup.ts
  with-test-fixtures.ts
  support/
    shared-testcontainers.ts
    cleanup.ts
    ids.ts
  approval/
    <scenario-name>.test.ts
```

- `global-setup.ts` starts and stops the shared dependency containers
- `with-test-fixtures.ts` exposes builder-pattern fixtures for disposable per-test resources
- `support/shared-testcontainers.ts` owns the local container-starting helpers and any normalization of the connection metadata
- `support/cleanup.ts` owns resource-specific delete helpers
- `approval/*.test.ts` uses the shared runtime plus disposable fixtures

If the repository already has a better local testing layout, reuse it. The important part is the lifecycle split, not the exact folders.

## Prefer the repository's current Vitest conventions

Vitest's `globalSetup` shape varies slightly by version and configuration style. Preserve the repository's existing convention if it already has one.

- If the repo already uses a `globalSetup` file that returns a teardown function, extend that.
- If the repo already exposes named setup or teardown exports, keep that shape.
- If the repo already has a helper around `provide` or `inject`, reuse it.

Do not rewrite the repository's Vitest style just to match this reference. Match the local convention, keep the lifecycle intent.

## `global-setup.ts` starter

Use the shared setup file to boot expensive containers once and surface the resulting connection details to tests.

```ts
type SharedTestContainers = {
  postgres?: { connectionString: string };
  azurite?: { connectionString: string };
  cosmos?: { endpoint: string; key: string };
  serviceBus?: { connectionString: string };
  eventHubs?: { connectionString: string };
  redis?: { url: string };
};

type Stoppable = {
  stop: () => Promise<unknown> | unknown;
};

const stopAll = async (started: Stoppable[]) => {
  await Promise.allSettled(
    [...started].reverse().map((resource) => resource.stop()),
  );
};

export default async function globalSetup({
  provide,
}: {
  provide: (key: string, value: unknown) => void;
}) {
  const started: Stoppable[] = [];

  const postgres = await startPostgres();
  started.push(postgres);

  const azurite = await startAzurite();
  started.push(azurite);

  const cosmos = await startCosmosEmulator();
  started.push(cosmos);

  const serviceBus = await startServiceBusEmulator();
  started.push(serviceBus);

  const eventHubs = await startEventHubsEmulator();
  started.push(eventHubs);

  const redis = await startRedis();
  started.push(redis);

  const testContainers: SharedTestContainers = {
    postgres: { connectionString: postgres.getConnectionUri() },
    azurite: { connectionString: azurite.getConnectionString() },
    cosmos: {
      endpoint: cosmos.getEndpoint(),
      key: cosmos.getKey(),
    },
    serviceBus: { connectionString: serviceBus.getConnectionString() },
    eventHubs: { connectionString: eventHubs.getConnectionString() },
    redis: { url: redis.getConnectionUrl() },
  };

  console.info("[golden-master] shared containers ready");
  console.info(JSON.stringify(testContainers, null, 2));

  provide("testContainers", testContainers);

  return async () => {
    await stopAll(started);
  };
}
```

Keep the actual container helpers local and boring:

- prefer official Testcontainers modules when they exist
- wrap emulator-specific `GenericContainer` startup in tiny local helpers when no official module exists
- print only connection details and stable metadata that help the tests or the developer connect to the running dependencies
- keep secrets and noisy runtime identifiers out of logs if they are not needed

If the local Vitest version exposes `provide` differently, keep the same lifecycle and adapt only the transport of the shared values.

## What to print during global setup

Print the exact connection details a human or test helper needs:

- connection strings
- endpoints
- database names or default namespaces if the helper chooses them centrally
- any feature flags or emulator notes that materially affect the run

Do this once during startup so a developer can copy the values while debugging a failing approval test.

## `withTestFixtures` starter

Use Vitest's **builder-pattern** `test.extend(...)` fixtures so setup is local and cleanup stays inside the fixture that created the resource.

Prefer the cleanup primitive the installed Vitest version actually supports:

- if the local version exposes `onCleanup`, use it
- if the local version only exposes `use(value)`, keep the same fixture shape and perform cleanup in `try/finally` around `await use(...)`

Do not silently drop back to suite-level `beforeEach` / `afterEach` cleanup just because the repository is on an older Vitest release.

Type only the shared services that this helper actually uses. The example below shows Cosmos, Service Bus, blob prefixes, and Redis-oriented fixtures.

```ts
import { randomUUID } from "node:crypto";
import { inject, test as baseTest } from "vitest";

const sharedTestContainers = () =>
  inject<{
    cosmos: { endpoint: string; key: string };
    serviceBus: { connectionString: string };
    azurite: { connectionString: string };
    redis: { url: string };
  }>("testContainers");

export const test = baseTest.extend<{
  blobPrefix: string;
  cosmosContainer: Awaited<ReturnType<typeof createTestCosmosContainer>>;
  redisNamespace: string;
  serviceBusQueue: string;
  testContainers: ReturnType<typeof sharedTestContainers>;
  testId: string;
}>({
  testId: async ({ task }, use) => {
    void task;
    await use(`test-${randomUUID()}`);
  },
  testContainers: async ({ task }, use) => {
    void task;
    await use(sharedTestContainers());
  },
  cosmosContainer: async ({ testContainers, testId }, use) => {
    const container = await createTestCosmosContainer(
      testContainers.cosmos,
      testId,
    );

    try {
      await use(container);
    } finally {
      await container.delete();
    }
  },
  blobPrefix: async ({ testId }, use) => {
    const prefix = `approval/${testId}`;

    try {
      await use(prefix);
    } finally {
      await deleteBlobsForPrefix(prefix);
    }
  },
  redisNamespace: async ({ testId }, use) => {
    const namespace = `approval:${testId}`;

    try {
      await use(namespace);
    } finally {
      await deleteRedisNamespace(namespace);
    }
  },
  serviceBusQueue: async ({ testContainers, testId }, use) => {
    const queueName = `approval-${testId}`;

    await createQueue(testContainers.serviceBus, queueName);

    try {
      await use(queueName);
    } finally {
      await deleteQueue(testContainers.serviceBus, queueName);
    }
  },
});
```

This is the important part:

- use the repository's supported Vitest fixture cleanup API instead of assuming a newer release
- keep cleanup tied to the resource that created it
- keep cleanup inside the fixture rather than spreading it across the test body or suite hooks

## Fixture cleanup design rule

If the local Vitest version exposes `onCleanup`, it can only be registered **once per fixture**. That pushes the design in a good direction:

- prefer one fixture per disposable resource family
- if a test needs a Cosmos container and a queue, make them separate fixtures
- if one fixture truly owns multiple resources, register one cleanup that deletes all of them in a controlled order or keep one `try/finally` block around `await use(...)`

Avoid giant "do everything" fixtures. Smaller fixtures are easier to reason about, compose, and clean up safely.

## Fixture design rules

1. Generate a stable `testId` once and derive all disposable names from it.
2. Create resources lazily. If a test never uses Redis, do not allocate Redis cleanup work for it.
3. Keep fixtures test-scoped unless the resource itself is intentionally shared.
4. Prefer deleting the exact disposable resource over broad "truncate everything" cleanup.
5. Keep cleanup local to the characterization helper, not spread across the test body.
6. If cleanup is asynchronous or flaky, fail loudly; do not silently ignore leftover data.

## Service-specific isolation hints

Use the shared container to host cheap logical isolation units:

| Service              | Good per-test disposable unit                |
| -------------------- | -------------------------------------------- |
| Postgres             | schema, database, or namespaced table prefix |
| Azurite Blob         | container name or blob prefix                |
| Azurite Queue        | queue name                                   |
| Cosmos Emulator      | database and container name                  |
| Service Bus Emulator | queue, topic, or subscription name           |
| Event Hubs Emulator  | event hub or consumer group                  |
| Redis                | key prefix, stream name, or namespace        |

Pick the smallest disposable unit that keeps tests isolated and cleanup predictable.

## Watch mode note

In watch mode, the Vitest process can stay alive for a long time:

- shared containers usually stay up until the process exits or restarts
- test data from a failed cleanup can survive into the next rerun
- manual cleanup steps hidden in the test body are easy to forget

That is why the cleanup has to live in the fixture helper itself, not in ad hoc code at the end of each test.

## Common mistakes

- booting Cosmos Emulator, Azurite, or Redis inside every test even though the suite is approval-style and could share them
- booting Cosmos Emulator, Azurite, or Redis in `beforeAll` on every rerun even though Vitest `globalSetup` is available and the user did not ask for ephemeral containers
- sharing mutable fixture data across tests just because the container is shared
- assuming `onCleanup` exists in every Vitest version instead of checking the repository's actual fixture API support
- pushing cleanup into suite hooks because the local Vitest version differs, instead of keeping it inside the fixture with `onCleanup` or `use(...)` plus `try/finally`
- registering multiple `onCleanup` callbacks in one fixture instead of splitting the resources or combining cleanup deliberately
- printing nothing during setup, then making debugging harder because nobody knows how to connect to the shared containers
- deleting all data globally when a smaller resource-specific cleanup would keep failures easier to diagnose

## What good output looks like

When this pattern is the right fit, the skill should leave behind:

- a `global-setup.ts` that starts the expensive dependencies once and tears them down once
- a `withTestFixtures` helper that exposes disposable per-test resources through builder-pattern fixtures
- approval tests that read naturally and only request the fixtures they need
- cleanup logic that lives with the fixture, not in manual `afterEach` branches spread across the suite
