---
"messages-app": patch
---

Align message content and status codecs with legacy reads by defaulting nullable boolean flags to false, rejecting zero payment amounts and malformed dates, normalizing dates to UTC, and excluding the internal content timestamp from responses.
