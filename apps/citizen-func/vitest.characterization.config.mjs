import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    exclude: ["**/node_modules/**", "**/dist/**"],
    globalSetup: "./tests/global-setup.ts",
    hookTimeout: 60000,
    include: ["tests/characterization/**/*.test.ts"],
    testTimeout: 60000,
  },
});
