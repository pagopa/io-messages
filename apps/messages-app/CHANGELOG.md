# messages-app

## 1.0.4

### Patch Changes

- aed09c5: Remove response from telemetry

## 1.0.3

### Patch Changes

- def2cdb: Improve send telemetry
- def2cdb: Use only error in SEND telemetry

## 1.0.2

### Patch Changes

- e0423ab: Improve send telemetry

## 1.0.1

### Patch Changes

- d0f2b1b: Add send telemetry

## 1.0.0

### Major Changes

- 313d617: Use new rc and payment path

## 0.11.0

### Minor Changes

- 583bcd5: Move the fiscal code from the params to the x-user header for GetMessage, GetMessages and UpsertMessageStatus

## 0.10.0

### Minor Changes

- 94e9268: Add GetRCAttachment endpoint

## 0.9.3

### Patch Changes

- efd527a: Preserve rejection reasons when updating message status and return HTTP 409 for version conflicts and HTTP 429 for storage throttling without overriding platform error messages.

## 0.9.2

### Patch Changes

- dbd6e1f: Align message content and status codecs with legacy reads by defaulting nullable boolean flags to false, rejecting zero payment amounts and malformed dates, normalizing dates to UTC, and excluding the internal content timestamp from responses.

## 0.9.1

### Patch Changes

- a26b414: Align GetMessages with legacy behavior by falling back to the organization fiscal code for payment identifiers, always requiring SEND message preconditions, and fetching remote content configuration only when the message does not specify a precondition.

## 0.9.0

### Minor Changes

- 7272d1e: Add Get Remote Content Message to messages-app

## 0.8.0

### Minor Changes

- 6852084: Add the third-party message precondition route

## 0.7.7

### Patch Changes

- 860cd08: Add remote content proxy for generic third party messages and SEND messages

## 0.7.6

### Patch Changes

- 9e41784: Add build lollipop headers use case

## 0.7.5

### Patch Changes

- 3ad7cb0: Refactor pagopaecommerce adapter

## 0.7.4

### Patch Changes

- 29497b0: Add lollipop adapter and lc-params repository

## 0.7.3

### Patch Changes

- 0f43f39: Adding age check for services

## 0.7.2

### Patch Changes

- 74d7d6f: Add remote content ports and adapters
- Updated dependencies [74d7d6f]
  - io-messages-common@1.4.6

## 0.7.1

### Patch Changes

- ea5a255: Update dockerfile to include generate command

## 0.7.0

### Minor Changes

- 2eb46e6: Add GetPaymentInfo endpoint

## 0.6.2

### Patch Changes

- f9db689: Update zod version

## 0.6.1

### Patch Changes

- 5df138e: Remove unnecessary COMMON_STORAGE_QUEUE_URI

## 0.6.0

### Minor Changes

- cb4e640: Add create message to messages-app

### Patch Changes

- Updated dependencies [cb4e640]
  - io-messages-common@1.4.5

## 0.5.0

### Minor Changes

- 2574fd8: Add GetMessage endpoint.

## 0.4.0

### Minor Changes

- 7a300a3: Added UpsertMessageStatus API on messages-app

## 0.3.0

### Minor Changes

- 9ce9735: Implement get service cms instead of mocked values

## 0.2.7

### Patch Changes

- 14bbbe9: update required ports and adapters for the upcoming getMessage implementation

## 0.2.6

### Patch Changes

- 98dcf01: Make initAzureMonitor run before the entire applicative.

## 0.2.5

### Patch Changes

- a6c2832: Call rc-app in order to get rc details in get messages.

## 0.2.4

### Patch Changes

- c5e169e: Add logs through @pagopa/azure-tracing

## 0.2.3

### Patch Changes

- 23b00ca: Remove at alias for src directory

## 0.2.2

### Patch Changes

- 6aded60: Add MalformedEntityError and use it in the GetMessages business logic.

## 0.2.1

### Patch Changes

- c808846: Fix StorageBlobHealthcheckAdapter healthcheck

## 0.2.0

### Minor Changes

- 6f71ddb: Add healthcheck endpoint

## 0.1.0

### Minor Changes

- bf5a723: Add get messages endpoint.

## 0.0.2

### Patch Changes

- 8dbd665: Bootstrap messages-app with info endpoint.
