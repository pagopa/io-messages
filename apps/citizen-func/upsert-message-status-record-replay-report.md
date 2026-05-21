# UpsertMessageStatus record-replay report

## Scope

This report covers the record-replay workflow for `apps/citizen-func` on the `PUT /api/v1/messages/{fiscalcode}/{id}/message-status` boundary.

## Suite overview

- **Path:** record-replay
- **Boundary:** real local Azure Functions host started with `func start`
- **Scenario count:** 1
- **Cassette mode:** `record` refreshes the stored artifacts, `verify` reruns the same flow and fails on drift

## Shared harness

| Component | Location | Purpose |
| --- | --- | --- |
| Vitest characterization config | `apps/citizen-func/vitest.characterization.config.mjs` | Runs only the characterization suite with shared global setup |
| Global setup | `apps/citizen-func/tests/global-setup.ts` | Starts Azurite through Testcontainers and creates a run-scoped remote Cosmos database/container |
| Function host wrapper | `apps/citizen-func/tests/support/function-host.ts` | Starts the real Functions host and waits for the route to answer |
| Cloud Cosmos helpers | `apps/citizen-func/tests/support/cloud-cosmos.ts` | Seeds the starting document and reads back the persisted side effect |
| Cassette helpers | `apps/citizen-func/tests/support/cassettes.ts` | Writes and reads multilayer cassette files |
| Normalization helpers | `apps/citizen-func/tests/support/normalization.ts` | Replaces dynamic ports, timestamps, run tokens, and Cosmos metadata |

## Scenario coverage

| Scenario | Suite file | Honest boundary exercised | Observable outcome | Infrastructure used |
| --- | --- | --- | --- | --- |
| Upsert reading happy path | `apps/citizen-func/tests/characterization/upsert-message-status.characterization.test.ts` | Local Azure Functions HTTP route | `200` response with updated read status and version increment, plus readback of the latest Cosmos document | Remote Cosmos account from `.env.test`, `DefaultAzureCredential` inside the app, Testcontainers Azurite for `AzureWebJobsStorage` |

## Rerun commands

```bash
pnpm --filter citizen-func test:record
pnpm --filter citizen-func test:verify
```

## Intentional gaps

- Only the happy-path `reading` update is frozen here.
- Error branches and validation behavior are intentionally left out of this characterization suite because they were not selected for scope.
