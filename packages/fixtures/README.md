# fixtures

This package contains message fixtures used for testing purposes.

## Installation

To use these fixtures, install this package in the applications you want to test.

## Setup

1. Create a file named `scripts/fixtures.js` in your application.
   - Use this file to call the `loadFixtures` function. You can find an example [here](https://github.com/pagopa/io-messages/blob/feats/add-etl-fixtures/apps/etl-func/scripts/fixtures.ts).
2. Add a script to the `package.json` of your application:
   - Name the script `fixtures`. See an example [here](https://github.com/pagopa/io-messages/blob/feats/add-etl-fixtures/apps/etl-func/package.json#L12).

## Usage

Run the following command to generate and load fixtures:

```bash
yarn fixtures <NUMBER>
```

- Replace `<NUMBER>` with the number of fixtures you want to generate and load.
- Environment variables are automatically injected from the `local.settings.json` file located in the `apps` directory.
