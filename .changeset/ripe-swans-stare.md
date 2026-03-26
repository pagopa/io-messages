---
"pushnotif-func": patch
---

Move all the dependency initialization in main function.

- Removed the legacy IConfig type (io-ts) in favour of the new Zod-based Config
  schema, including all required environment variables
- Moved all dependencies and function initializations inside the main function
  within main.ts for better scoping
- Relocated the info function to adapters/functions to align with the project
  architecture
- Removed the FISCAL_CODE_NOTIFICATION_BLACKLIST variable and its associated
  logic as they were unused.
