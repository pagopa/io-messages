import { defineConfig } from "vitest/config";

// Default unit-test config. Excludes the heavyweight characterization suite so
// `pnpm test` never accidentally starts the full local topology.
export default defineConfig({
  test: {
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/characterization/**",
    ],
  },
});
