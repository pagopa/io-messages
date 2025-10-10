## Export

Run with `yarn export [-t 100] [-k <TOKEN>]` where -t is the amount of registrations to retrieve and -k is the continuation token from a previous execution.
Will print continuation token on screen for next execution.

## Import

Run with `yarn import -p <PATH_TO_CSV>` where -p is the path to a csv containing a list of couples `registrationId,installationId`.
