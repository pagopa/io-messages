# io-nh-utils

Collection of utilities to export and migrate installations from one notification hub to another

## Export

Run with `yarn nh:export`.

```
-t, --top       Max amount of registrations to retrieve, optional, default to 1000
-k, --token     Continuation token for pagination, optional
-p, --path      Full path to the CSV file, optional
```

Outputs the continuation token for the next execution.
Outputs a CSV (default path ./data/yyyy-MM-ddTHH-mm-ss-SSSZ.csv) containing the list of `installationIds`.

### Example

First run

`yarn export -t 10`

Expected console output

```
Exported 10 registrations in /workspace/packages/io-nh-utils/data/yyyy-MM-ddTHH-mm-ss-SSSZ.csv
Continuation token for next execution: mShfO
```

Resume previous run

`yarn export -t 1000000 -k mShfO -p /workspace/packages/io-nh-utils/data/yyyy-MM-ddTHH-mm-ss-SSSZ.csv`

## Import

Run with `yarn import -p <PATH_TO_CSV>`.

```
-p, --path            Full path to the CSV file
-b, --batch-size      Size of concurrent requests to send, optional, default 10
```

The CSV file must contain the `installationId` header.

### Example

First run

`yarn import -b 100 -p /workspace/packages/io-nh-utils/data/yyyy-MM-ddTHH-mm-ss-SSSZ.csv`
