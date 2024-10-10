# etl-func

## How to run locally

### Create a local.settings.json

You can use the `local.settings.json.example` file:

```bash
cp local.settings.json.example ./.local.settings.json
```

### Add your test environment variables

t.b.d.

```json
#TODO: Add environment variables here
```

### Start the project

Build the code with `tsc`:

```bash
yarn build
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
