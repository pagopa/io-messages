# etl-fixtures

This package contains fixtures for the etl function.
If you want to test the etl function, you can use these fixtures by simply
running the following command inside the `etl-func` app:

```bash
yarn fixtures:load
```

In order to be able to load fixtures you need a file named `.env.local` in the
root of this repo where to put your environment variables, you can find an
example in the `.env.local`.
