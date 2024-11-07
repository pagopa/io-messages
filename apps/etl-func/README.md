# etl-func

## How to run locally

### Create a local.settings.json

You can use the `local.settings.json.example` file:

```bash
cp local.settings.json.example ./.local.settings.json
```

### Add your test environment variables

```bash
cp local.settings.json.example .local.settings.json
```

### Settings

| Setting                           | Type     | Required | Description                                       |
| --------------------------------- | -------- | -------- | ------------------------------------------------- |
| `FUNCTIONS_WORKER_RUNTIME`        | `string` | `true`   | Must be "node". No need to be changed             |
| `MESSAGE_CONTENT_STORAGE_URI`     | `string` | `true`   | URI of the azure storage resource                 |
| `MESSAGE_CONTENT_CONTAINER_NAME`  | `string` | `true`   | Name of the storage container                     |
| `MESSAGE_EVENTHUB_CONNECTION_URI` | `string` | `true`   | Eventhub connection string from the azure portal. |
| `MESSAGE_EVENTHUB_NAME`           | `string` | `true`   | Name of the Eventhub azure resource               |

### Start the project

Install dependencies using the node version inside the .node-version file:

```bash
yarn install
```

Build the code:

```bash
yarn build
```

Azure authentication. Its needed for the usage of remote azure resources:

```bash
az login
```

Start the function with azure function core tools.

```bash
yarn start
```

### Call the healthcheck

```bash
curl http://localhost:7071/api/health
```

Expected output:

```bash
it works!
```
