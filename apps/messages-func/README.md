# messages-func

This Azure Functions app is the future home for message-processing workers now
hosted in `services-func`. The skeleton registers only `GET /api/info`. It does
not consume or publish messages, and it has no separate health endpoint.

The HTTP adapter calls the Info use case, which depends on an `AppInfoReader`
port. The outbound adapter reads the deployed `package.json`. The composition
root (`src/func.ts`) wires the adapters and registers the function.

## Run locally

Use the repository's Node.js and pnpm versions, Azure Functions Core Tools v4,
and Docker Compose. From the repository root:

```sh
pnpm install --frozen-lockfile
docker compose up -d azurite
cp apps/messages-func/local.settings.json.example apps/messages-func/local.settings.json
pnpm --filter messages-func build
pnpm --filter messages-func start
```

Azurite is used only for the Functions host storage. No Azure login, cloud
resources, or messaging data are needed. Do not commit `local.settings.json`.

```sh
curl -i http://localhost:7077/api/info
```

Expect HTTP 200 and a JSON response such as
`{"name":"messages-func","version":"0.0.0"}`. The version is taken from the
running package. If its metadata cannot be read, Info returns HTTP 500.

### Test with Bruno

With the function running, open the [io-messages collection](../../bruno) in
Bruno, select the **Development** environment and send **Info** from the
**messages-func** folder. The request needs no credentials and checks for HTTP
200, the app name and a non-empty version.

With Bruno CLI installed, you can run the same request from the repository root:

```sh
cd bruno
bru run messages-func/Info.bru --env Development
```

## Deployment

The [Terraform module](../../infra/resources/_modules/web_apps/messages_func.tf)
creates a private Function App with a staging slot and dedicated host storage.
The app and slot use `/api/info` for their probe and warm-up. It checks that the
app and package are available, not that any downstream dependencies are healthy.

Before merging the infrastructure change, review the PR's **Plan (resources)**
output and confirm shared ETL plan capacity, subnet IP availability and network
policy with the cloud team. Reassess isolation and capacity before adding
message-processing workloads.

After **Apply (resources)** completes, use the manual
[Deploy (messages-func)](../../.github/workflows/deploy-messages-func.yaml)
workflow. Verify `/api/info` on staging from the private network before approving
the slot swap.
