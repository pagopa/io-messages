# ops-ca

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
