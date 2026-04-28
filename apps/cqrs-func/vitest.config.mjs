import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      exclude: [
        "dist",
        "*.js",
        "**/__mocks__",
        "/node_modules",
        "src/**/config.ts",
        "src/**/main.ts",
        "eslint.config.mjs",
        "vitest.config.mjs",
      ],
      reporter: ["lcov", "text"],
    },
    exclude: ["**/node_modules/**", "**/dist/**"],
  },
});
