# io-messages-common-legacy

## 0.0.2

### Patch Changes

- 54f2fcf: remove azure-storage lib
  create `io-messages-common-legacy` package containing shared utilities that can be imported by the legacy io-messages workspaces using CommonJS.
  add message content type and repository to the `io-messages-common-legacy` package as replacements for the `messageModel` and `getContentFromBlob` function previously used to retrieve message content.
