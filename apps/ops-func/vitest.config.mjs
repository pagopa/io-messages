import * as path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    coverage: {
      exclude: [
        "dist",
        "*.js",
        "/node_modules",
        "src/**/config.ts",
        "src/**/func.ts",
        "eslint.config.mjs",
        "vitest.config.mjs",
      ],
      reporter: ["lcov", "text"],
    },
    exclude: ["**/node_modules/**", "**/dist/**"],
  },
});
