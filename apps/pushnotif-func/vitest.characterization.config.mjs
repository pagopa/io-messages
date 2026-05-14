import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    exclude: ["**/node_modules/**", "**/dist/**"],
    globalSetup: "./src/characterization/__tests__/support/global-setup.ts",
    include: ["src/characterization/__tests__/**/*.test.ts"],
    hookTimeout: 120000,
    testTimeout: 30000,
  },
});
