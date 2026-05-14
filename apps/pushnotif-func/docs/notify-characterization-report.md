# Notify characterization report

## Scope

- **Path**: `record-replay`
- **Boundary**: equivalent local HTTP runtime around the real `Notify` wrapper
- **Scenarios**:
  1. `notify-message-happy-path`
  2. `notify-invalid-payload`
  3. `notify-message-wrong-user-group`

## Why this boundary

The suite does **not** boot the full `pushnotif-func` host. `src/main.ts` wires Cosmos clients through `DefaultAzureCredential`, and this repository does not provide a credible local Cosmos + AAD topology for the `Notify` path. The characterization harness therefore freezes the HTTP contract of `Notify` plus its real queue side effect, instead of pretending the full app host is locally reproducible.

## Local topology

- **Shared containerized dependency**: Azurite via Testcontainers
- **Observed side effect**: `push-notifications` queue payload read back from Azurite
- **Local runtime**: a tiny HTTP server that delegates to the real `Notify` wrapper
- **Fixture-backed collaborators**: profile lookup, message lookup, service lookup, session status

## Scenario overview

| Scenario | Suite | Honest boundary | Observable outcome | Infrastructure used |
| --- | --- | --- | --- | --- |
| `notify-message-happy-path` | `src/characterization/__tests__/notify.record-replay.test.ts` | local HTTP runtime around `Notify` | `204` plus one message in `push-notifications` | Azurite queue + fixture-backed readers |
| `notify-invalid-payload` | `src/characterization/__tests__/notify.record-replay.test.ts` | local HTTP runtime around `Notify` | `400` validation response and no queue side effect | local runtime only |
| `notify-message-wrong-user-group` | `src/characterization/__tests__/notify.record-replay.test.ts` | local HTTP runtime around `Notify` | `403` authorization response and no queue side effect | local runtime only |

## Files added or changed

- `vitest.characterization.config.mjs`
- `src/characterization/__tests__/notify.record-replay.test.ts`
- `src/characterization/__tests__/support/*`
- `src/characterization/__tests__/cassettes/*`
- `vitest.config.mjs`
- `package.json`

## Harness structure

- `support/global-setup.ts` starts Azurite once and provides the connection details to Vitest
- `support/notify-runtime.ts` exposes the local HTTP runtime around `Notify`
- `support/harness.ts` owns queue setup, runtime lifecycle, topology metadata, and queue read-back
- `support/cassettes.ts` persists multilayer cassettes deterministically
- `support/scenarios.ts` holds the selected record/verify scenarios and normalization rules

## Intentional gaps

- The suite does not cover the full Azure Functions host boot path.
- It does not exercise Cosmos-backed profile, message, or service adapters.
- It freezes the `Notify` contract plus queue output only; queue-trigger consumers remain outside this characterization set.

## Rerun commands

```bash
pnpm --filter pushnotif-func test:characterization:record
pnpm --filter pushnotif-func test:characterization:verify
```
