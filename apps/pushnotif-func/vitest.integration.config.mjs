import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    exclude: ["**/node_modules/**", "**/dist/**"],
    globalSetup: "./tests/global-setup.ts",
    include: ["tests/integration/**/*.test.ts"],
    testTimeout: 30000,
  },
});
