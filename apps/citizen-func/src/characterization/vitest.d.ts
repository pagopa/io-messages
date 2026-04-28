import type { SharedContainers } from "./global-setup";

declare module "vitest" {
  interface ProvidedContext {
    sharedContainers: SharedContainers;
  }
}
