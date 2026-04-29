# Boundary selection for backend integration tests

Use this reference when it is not obvious whether the suite should drive the full runtime or a smaller integration slice.

## First principle

Pick the smallest **honest** boundary for the contract the user wants to protect.

- Start at the **full runtime** when the contract is visible to real callers or downstream systems there.
- Drop to a **smaller in-process slice** only when that still exercises the real wiring that matters and the runtime boundary would mostly add noise, slowness, or framework detail.

The goal is not to maximize scope. The goal is to maximize signal.

## Decision matrix

| Situation                                                               | Preferred boundary                              | Why                                                                | Avoid                                                             |
| ----------------------------------------------------------------------- | ----------------------------------------------- | ------------------------------------------------------------------ | ----------------------------------------------------------------- |
| HTTP route, middleware, auth, serialization, headers, or status mapping | Full local HTTP runtime                         | Those behaviors only become real at the host boundary              | Importing the handler directly when the server can run locally    |
| Azure Function trigger, binding, host config, or emitted output         | Full local Functions host or app container      | Trigger wiring and binding behavior are part of the contract       | Calling the handler directly unless no credible local host exists |
| Worker or consumer reacts to broker messages                            | Real local worker plus local broker or emulator | Transport semantics and runtime wiring matter                      | Unit tests that only call the message handler with mocks          |
| Repository, storage adapter, or cache adapter behavior                  | Adapter or repository plus real dependency      | The contract is between the adapter and the real persistence layer | Booting the full HTTP runtime just to test CRUD mapping           |
| Real HTTP client adapter calling a partner service                      | Adapter plus deterministic local stub server    | The protocol seam is the real contract                             | Mocking the SDK or spying on request builders                     |
| Use case orchestrating multiple real adapters                           | Honest multi-layer slice inside the process     | You want orchestration signal without framework noise              | Mock-heavy tests still called "integration"                       |
| One happy path needs host-level proof, but error matrix is large        | Mix boundaries intentionally                    | One runtime proof plus narrower slices often gives better value    | Forcing every branch through the host                             |

## Heuristics that usually work

Choose the full runtime by default when the prompt mentions:

- endpoint, route, HTTP, middleware, auth, request or response contract
- Azure Functions host, trigger, binding, queue output, timer, or worker runtime
- "real host", "real server", "real runtime", or "don't call the handler directly"
- emulator reuse across the suite for an app that can already run locally

Choose a smaller slice first when the prompt mentions:

- repository, adapter, persistence mapping, client adapter, or use case orchestration
- promotion of existing unit tests around adapters or use cases
- a need for many scenario variations where the runtime would mostly repeat framework setup

## Mixed suites are healthy

Do not force one boundary for every scenario.

A strong pattern is:

1. one or two runtime-level tests that prove the public or deployed seam
2. a smaller number of slice-level integration tests that cover denser variation with the same real dependencies

That keeps the suite honest without letting the slowest boundary dominate every case.

## Common mistakes

- Calling a direct handler or controller import "integration" when the host can run locally
- Booting the full runtime for pure adapter or repository contracts that do not need it
- Keeping mocked Redis, Postgres, Cosmos, or partner HTTP clients and still calling the test an integration suite
- Copying unit tests one-for-one instead of collapsing them into a few high-value scenarios
- Letting the broadest boundary dictate every case, even when most cases only care about a narrower seam

## Practical rule of thumb

If a real local caller or downstream system would notice the behavior, start at the runtime boundary.

If the meaningful contract is inside the process but still crosses real adapters or persistence, a smaller slice is acceptable.

If you can only defend the word "integration" by saying "well, the classes are real even though all collaborators are mocked", you do not have the right boundary yet.
