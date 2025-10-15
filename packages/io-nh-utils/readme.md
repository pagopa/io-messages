## Export

Run with `yarn export [-t <1000>] [-k <TOKEN>] [-p <PATH_TO_CSV>]`.

```
-t, --top       Max amount of registrations to retrieve
-k, --token     Continuation token for pagination
-p, --path      Full path to the CSV file
```

Outputs the continuation token for the next execution.
Outputs a .csv containing the list of installationIds.

## Import

Run with `yarn import -p <PATH_TO_CSV>`.

```
-p, --path      Full path to the CSV file
```

The CSV file must contain the `installationId` header.
