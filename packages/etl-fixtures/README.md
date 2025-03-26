# etl-fixtures

This package contains fixtures for the etl function.
If you want to test the etl function, you can use these fixtures by simply
running the following command inside the `etl-func` app:

```bash
yarn fixtures:load
```

Environment variables are directly injected from the `local.settings.json` file
inside the `apps/etl-func`.
