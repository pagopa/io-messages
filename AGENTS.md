# AGENTS.md

## Build, Test, and Lint Commands

```bash
# Build all workspaces (from root)
yarn build

# Run all tests (from root)
yarn test

# Lint all workspaces (from root) [Prefer linting single workspaces to get more focused feedback]
yarn lint

# Run the full code review check (typecheck + format + lint + coverage)
yarn code-review

# Run tests for a single workspace
yarn workspace <workspace-name> test
# e.g.: yarn workspace send-func run test

# Run a single test file
yarn workspace <workspace-name> test -- src/<apps/package>/workspace-name/\*\*/__tests__/my-use-case.test.ts

# Typecheck a single workspace
yarn workspace <workspace-name> typecheck

# Lint a single workspace
yarn workspace <workspace-name> lint

```

Turbo caches outputs; use `--force` to bust the cache when needed.

## Architecture

This is a **Yarn(v4 PnP) workspaces + Turborepo monorepo** hosting multiple Azure Functions apps and a shared package.

**`apps/`** — Ten independent Azure Functions applications, each deployable separately:

- `citizen-func` — Read/query messages for end-users (GetMessage, GetMessages, UpsertMessageStatus)
- `send-func` — AAR (Analogical Registered Receipt) notifications and Lollipop integration
- `rc-func` — Remote Content (RC) configuration CRUD and CosmosDB change feed handler
- `services-func` — Service-related functions
- `ops-func` — Operator/admin operations (e.g., message deletion with audit logging)
- `cqrs-func`, `etl-func`, `pushnotif-func`, `reminder`, `payment-updater` — Event-driven processing functions

**`packages/io-messages-common`** — Internal shared library (ESM) used across apps. Contains:

- `adapters/config` — Environment config loader
- `adapters/lollipop` — Lollipop signature middleware
- `adapters/middleware` — Azure Functions middleware helpers
- `domain/` — Shared domain types

**Infrastructure** is in `infra/` (Terraform). Integration tests live in `integration-tests/`.

## Three Coexisting Architectural Styles

### Older style (e.g., `citizen-func`, `services-func`)

- Uses **`fp-ts`** (`pipe`, `flow`, `TaskEither`, `Option`, `Either`) and **`io-ts`** for runtime validation
- Azure Functions registered via `@pagopa/express-azure-functions` wrapping Express handlers
- Function entrypoints in `src/functions/<FunctionName>/index.ts` + `handler.ts`
- Models from `@pagopa/io-functions-commons`
- Entrypoint: per-function `index.ts`

### Mixed style (e.g., `pushnotif-func`, `rc-func`)

- Uses **`fp-ts`** (`pipe`, `flow`, `TaskEither`, `Option`, `Either`) and **`io-ts`** for runtime validation
- Azure Functions v4 SDK (`@azure/functions`) registered directly in `src/main.ts`
- Compatibility Layer between Programming Model V4 and express using (`wrapHandlerV4`)
- Models from `@pagopa/io-functions-commons`

### Newer style (e.g., `send-func`, `ops-func`)

- **Clean architecture**: `src/domain/` (pure business logic, no infra deps) + `src/adapters/` (Azure, HTTP clients, storage)
- Azure Functions v4 SDK (`@azure/functions`) registered directly in `src/func.ts`
- Domain use-cases are plain classes with `execute()` methods; dependencies injected via constructor
- `zod` used in `io-messages-common`; newer apps may use it too
- `@` path alias resolves to `./src`

## Key Conventions

**OpenAPI codegen**: Many apps generate TypeScript types from OpenAPI specs. The pipeline is `openapi:bundle` → `generate` → types land in `src/generated/definitions/`. Never edit generated files manually.

**Module type**: App packages use `"type": "commonjs"`; `io-messages-common` uses `"type": "module"` (ESM with `tsc-alias` for path rewriting).

**Testing**: Tests live in `__tests__/` directories alongside the code they test. Both `.spec.ts` and `.test.ts` suffixes are used. Uses **Vitest** (not Jest) across all packages.

**Changesets**: Every PR with a version-bumping change must include a changeset file:

```bash
yarn changeset
```

**Adding dependencies**:

```bash
# Add to a specific app
yarn workspace <workspace-name> add <package>
# Add dev dependency
yarn workspace <workspace-name> add -D <package>
```

**Perform Linting**: On modified `apps` or `package` always perform a lint on modified workspaces.

**Pre-commit hooks**: On modified IaC `src/infra` always run linting and formatting using `pre-commit run -a`, configuration file is `.pre-commit-config.yaml`.

**Git operations**: avoid executing `git add`, `git commit`, or `git push` in scripts to prevent side effects. Instead, scripts should output necessary changes and let developers review and stage them manually.
