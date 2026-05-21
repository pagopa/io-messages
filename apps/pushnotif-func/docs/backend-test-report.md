# pushnotif-func backend test report

## Scope

This app now has **both**:

- an opt-in **integration** suite for real local queue and Notification Hubs side effects
- an opt-in **record-replay** suite for stable Azure Functions host contracts

The boundary is intentionally mixed. Full-host coverage is used where the contract is mostly runtime and middleware behavior; narrower live slices are used where the host would force Cosmos/AAD dependencies that do not have a credible local path in this workspace.

## Suite overview

| Path | Location | Purpose |
| --- | --- | --- |
| Integration | `tests/integration/**/*.test.ts` | Keep live coverage on queue payloads, binding outputs, and Notification Hubs side effects |
| Record-replay | `tests/characterization/pushnotif.characterization.test.ts` | Freeze host-level `Notify` rejection and `Health` degradation contracts |

## Shared harness

- `tests/global-setup.ts` boots **Azurite** through **Testcontainers**
- `tests/support/function-host.ts` starts the real local **Azure Functions host**
- `tests/support/notification-hubs-stub.ts` provides a local **HTTPS Notification Hubs stub**
- `tests/support/cassettes.ts` and `tests/support/normalization.ts` own `record` / `verify` persistence
- `tests/support/certs/` contains the local certificate used by the HTTPS stub

## Scenario coverage

| Scenario | File | Honest boundary | Observable outcome | Infrastructure |
| --- | --- | --- | --- | --- |
| Notify queue emission | `tests/integration/send-notification.integration.test.ts` | `sendNotification` service + real Azurite queue | Decoded `Notify` payload is read back from storage queue | Testcontainers Azurite |
| Installation update dispatch | `tests/integration/update-installation-dispatch.integration.test.ts` | Real Azure Functions output binding slice | `InvocationContext.extraOutputs` contains only stale valid update messages | Azure Functions SDK binding objects |
| Notify -> Notification Hubs side effect | `tests/integration/notification-hub.integration.test.ts` | Queue handler + real Notification Hubs SDK client | Stub receives `POST /messages` on the correct partition with contract-level payload | Local HTTPS Notification Hubs stub |
| Update installation side effect | `tests/integration/notification-hub.integration.test.ts` | Queue handler + real Notification Hubs SDK client | Stub receives installation `PATCH` with the expected massive template updates | Local HTTPS Notification Hubs stub |
| Massive notification NH lifecycle slice | `tests/integration/notification-hub.integration.test.ts` | Notification Hub adapter + real SDK client | Schedule, read, and cancel flows hit the stub through real SDK calls | Local HTTPS Notification Hubs stub |
| Notify invalid payload | `tests/characterization/pushnotif.characterization.test.ts` | Real local Azure Functions host | Stored `400` problem response for malformed payload | Testcontainers Azurite + cassette files |
| Notify forbidden scope | `tests/characterization/pushnotif.characterization.test.ts` | Real local Azure Functions host | Stored `403` problem response for wrong caller scopes | Testcontainers Azurite + cassette files |
| Health degraded | `tests/characterization/pushnotif.characterization.test.ts` | Real local Azure Functions host | Stored `500` degraded response with dependency failures | Testcontainers Azurite + cassette files |

## Rerun commands

```bash
pnpm --filter pushnotif-func test
pnpm --filter pushnotif-func test:integration
pnpm --filter pushnotif-func test:record
pnpm --filter pushnotif-func test:verify
```

## Intentional gaps

- The full-host **Notify happy path** is not covered yet because `src/main.ts` constructs Cosmos clients through `DefaultAzureCredential`, which makes the real host depend on Cosmos/AAD wiring that this local harness cannot boot honestly.
- The broader **massive job HTTP/Cosmos lifecycle** is still narrowed to Notification Hubs adapter coverage for the same reason.
