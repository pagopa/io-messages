# pushnotif-func backend test report

## Scope

This app now has **both**:

- an opt-in **integration** suite for black-box host-driven side effects
- an opt-in **record-replay** suite for stable Azure Functions host contracts

The boundary is intentionally mixed. The integration suite now drives the **real Functions host** through real Azurite queue ingress for the flows that can boot honestly in this workspace, while record-replay still freezes host HTTP contracts. The remaining full-host happy-path HTTP flows still depend on Cosmos/AAD wiring that does not have a credible local path here.

## Suite overview

| Path | Location | Purpose |
| --- | --- | --- |
| Integration | `tests/integration/**/*.test.ts` | Drive the real Functions host and assert on observable queue/Notification Hubs side effects |
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
| Notification Hub notify side effect | `tests/integration/notification-hub-host.integration.test.ts` | Real Functions host consuming the `notify-messages` queue | Stub receives `POST /messages` on the correct partition with contract-level payload | Testcontainers Azurite + local HTTPS Notification Hubs stub |
| Update installation side effect | `tests/integration/notification-hub-host.integration.test.ts` | Real Functions host consuming the `update-installations-dispatch` queue | Stub receives installation `PATCH` with the expected massive template updates | Testcontainers Azurite + local HTTPS Notification Hubs stub |
| Update installation `fcmv1` compatibility | `tests/integration/notification-hub-host.integration.test.ts` | Real Functions host consuming the `update-installations-dispatch` queue | Stub receives the expected Android installation patch for `fcmv1` payloads | Testcontainers Azurite + local HTTPS Notification Hubs stub |
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
- The broader **massive job HTTP/Cosmos lifecycle** is not black-boxed for the same reason.
- The **InstallationUpdateDispatcher** Cosmos trigger is not covered black-box because its listener still needs a real Cosmos/AAD path during host startup.
