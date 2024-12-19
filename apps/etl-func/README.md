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

### Start redis container [OPTIONAL]

If you don't have a remote redis, you can start a local container using this command

```bash
docker run --name etl_func_redis -p 6379:6379 -d redis:6.2.16 redis-server --appendonly yes --requirepass "${PASSWORD}"
```

Make sure:

1. the port 6379 is not used by another service
2. the ${PASSWORD} passed to the docker run is the same of your local.settings.json is REDIS_PASSWORD env variable

or simply change the values accordingly to your needs.

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
