---
"messages-app": patch
---

Align GetMessages with legacy behavior by falling back to the organization fiscal code for payment identifiers, always requiring SEND message preconditions, and fetching remote content configuration only when the message does not specify a precondition.
