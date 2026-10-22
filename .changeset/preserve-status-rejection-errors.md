---
"messages-app": patch
---

Preserve rejection reasons when updating message status and return HTTP 409 for version conflicts and HTTP 429 for storage throttling without overriding platform error messages.
