# Persistent Testcontainers for Vitest golden master suites

Use this reference when the user explicitly wants **golden master** or **approval** characterization tests on **Vitest**, especially when slow dependencies such as Cosmos DB Emulator, Azurite, Service Bus emulators, Event Hubs emulators, Redis, or Postgres dominate runtime.

This pattern is intentionally narrower than the rest of the skill. It is for approval-style suites that want deterministic per-test state without paying container bootstrap cost on every test.

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

Use Vitest's **builder-pattern** `test.extend(...)` fixtures so setup is local and cleanup is explicit through `onCleanup`.

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

export const test = baseTest
  .extend("testId", () => `test-${randomUUID()}`)
  .extend("testContainers", () => sharedTestContainers())
  .extend(
    "cosmosContainer",
    async ({ testContainers, testId }, { onCleanup }) => {
      const container = await createTestCosmosContainer(
        testContainers.cosmos,
        testId,
      );

      onCleanup(async () => {
        await container.delete();
      });

      return container;
    },
  )
  .extend("blobPrefix", async ({ testId }, { onCleanup }) => {
    const prefix = `approval/${testId}`;

    onCleanup(async () => {
      await deleteBlobsForPrefix(prefix);
    });

    return prefix;
  })
  .extend("redisNamespace", async ({ testId }, { onCleanup }) => {
    const namespace = `approval:${testId}`;

    onCleanup(async () => {
      await deleteRedisNamespace(namespace);
    });

    return namespace;
  })
  .extend(
    "serviceBusQueue",
    async ({ testContainers, testId }, { onCleanup }) => {
      const queueName = `approval-${testId}`;

      await createQueue(testContainers.serviceBus, queueName);

      onCleanup(async () => {
        await deleteQueue(testContainers.serviceBus, queueName);
      });

      return queueName;
    },
  );
```

This is the important part:

- **use `onCleanup`, not `use(...)`**
- make the fixture return the disposable resource after setup
- keep cleanup tied to the resource that created it

## `onCleanup` design rule

`onCleanup` can only be registered **once per fixture**. That pushes the design in a good direction:

- prefer one fixture per disposable resource family
- if a test needs a Cosmos container and a queue, make them separate fixtures
- if one fixture truly owns multiple resources, register one cleanup that deletes all of them in a controlled order

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
- sharing mutable fixture data across tests just because the container is shared
- using Playwright-style `use(...)` fixtures for new helpers when the repo is already on modern Vitest builder syntax
- registering multiple `onCleanup` callbacks in one fixture instead of splitting the resources
- printing nothing during setup, then making debugging harder because nobody knows how to connect to the shared containers
- deleting all data globally when a smaller resource-specific cleanup would keep failures easier to diagnose

## What good output looks like

When this pattern is the right fit, the skill should leave behind:

- a `global-setup.ts` that starts the expensive dependencies once and tears them down once
- a `withTestFixtures` helper that exposes disposable per-test resources through builder-pattern fixtures
- approval tests that read naturally and only request the fixtures they need
- cleanup logic that lives with the fixture, not in manual `afterEach` branches spread across the suite
