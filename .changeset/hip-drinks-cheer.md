---
"io-messages-common-legacy": patch
"cqrs-func": patch
---

remove azure-storage lib
create `io-messages-common-legacy` package containing shared utilities that can be imported by the legacy io-messages workspaces using CommonJS.
add message content type and repository to the `io-messages-common-legacy` package as replacements for the `messageModel` and `getContentFromBlob` function previously used to retrieve message content.
