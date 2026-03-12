---
"pushnotif-func": patch
---

Update error types for the notification repository.

- Add `ErrorTooManyRequests`
- Make updateInstallation return `ErrorTooManyRequests`
- Make updateInstallation return `ErrorInternal`
- Remove `ZodError` as return type of updateInstallation (never happens)
