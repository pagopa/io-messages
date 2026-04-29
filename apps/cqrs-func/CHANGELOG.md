# cqrs-func

## 2.1.3

### Patch Changes

- Updated dependencies [78efdfb]
  - io-messages-common-legacy@0.1.0

## 2.1.2

### Patch Changes

- c5d19d5: bump @io-functions-commons v30 -> v32

## 2.1.1

### Patch Changes

- 54f2fcf: remove azure-storage lib
  create `io-messages-common-legacy` package containing shared utilities that can be imported by the legacy io-messages workspaces using CommonJS.
  add message content type and repository to the `io-messages-common-legacy` package as replacements for the `messageModel` and `getContentFromBlob` function previously used to retrieve message content.
- Updated dependencies [54f2fcf]
  - io-messages-common-legacy@0.0.2

## 2.1.0

### Minor Changes

- d95ffc3: Remove @chasdevs/avro-to-typescript dependency, version avro types/classes

## 2.0.4

### Patch Changes

- 00ff90a: remove legacy migration toolkit

## 2.0.3

### Patch Changes

- 76cb4f7: Upgrade Github Actions

## 2.0.2

### Patch Changes

- 0555a04: Migrate Monorepo from Yarn PnP to pnpm

## 2.0.1

### Patch Changes

- e59ed9d: Update @types/node devDependecies to v22

## 2.0.0

### Major Changes

- 9479207: Migrate cqrs-func to Programming Model v4

## 1.0.9

### Patch Changes

- d26a76f: Reorganize Project structure, matching other projects in monorepo
- b7950aa: Configure Linting and formatter

## 1.0.8

### Patch Changes

- 5bf8eb2: Add migration toolkit

## 1.0.7

### Patch Changes

- 1d523e4: Remove unused code

## 1.0.6

### Patch Changes

- ede399d: Move cosmos trigger Function from cqrs to sending

## 1.0.5

### Patch Changes

- bf434f8: fix app insights init

## 1.0.4

### Patch Changes

- 81eb598: Fix cqrs deploy workflow

## 1.0.3

### Patch Changes

- 7c68436: Use all functions in host.json

## 1.0.2

### Patch Changes

- db2d7e1: Remove azure-files and table from healthcheck

## 1.0.1

### Patch Changes

- 5c3250c: Remove appinsights_disable variable

## 1.0.0

### Major Changes

- bab0003: First release after migration
- b7286ce: cqrs-func migration first release
