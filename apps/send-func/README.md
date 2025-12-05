# send-func

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

### Test API with Mockoon and Bruno

If you want to debug the API using mock data you need to:

1. start the Mockoon servers.
2. start the Bruno client and call the send-func API using the development environment

You can start the mockoon servers in different ways:

#### If you are using the Devcontainer

All the required mockoon servers are already running. Make sure to restart
the Mockoon containers after every git pull or code update.

in your local.setting.json setup the following envs like this:

```bash
"NOTIFICATION_CLIENT_UAT_API_KEY": "anApiKey",
"NOTIFICATION_CLIENT_UAT_BASE_URL": "http://mock-server-send:3000/api/v1",
"LOLLIPOP_API_BASE_URL": "http://mock-server-lollipop:3000/api/v1",
"LOLLIPOP_FUNC_KEY": "lollipopAPIKey",
```

#### Docker way:

```bash
docker compose up -f mock-server-send mock-server-lollipop
```

in your local.setting.json setup the following envs like this:

```bash
"NOTIFICATION_CLIENT_UAT_API_KEY": "anApiKey",
"NOTIFICATION_CLIENT_UAT_BASE_URL": "http://localhost:8005/api/v1",
"LOLLIPOP_API_BASE_URL": "http://localhost:8006/api/v1",
"LOLLIPOP_FUNC_KEY": "lollipopAPIKey",
```

#### Mockoon client way:

Install the mockoon client than load the required mockoon send.json and lollypop.json configurations
that you find in the ./mockoon folder of this project.

in your local.setting.json setup the following envs like this:

```bash
"NOTIFICATION_CLIENT_UAT_API_KEY": "anApiKey",
"NOTIFICATION_CLIENT_UAT_BASE_URL": "http://localhost:port_number_displayed_in_your_mockoon_client/api/v1",
"LOLLIPOP_API_BASE_URL": "http://localhost:port_number_displayed_in_your_mockoon_client/api/v1",
"LOLLIPOP_FUNC_KEY": "lollipopAPIKey",
```
