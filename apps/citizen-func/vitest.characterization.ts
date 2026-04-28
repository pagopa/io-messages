import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  server: {
    watch: {
      ignored: ["**/node_modules/**"],
    },
  },
  test: {
    env: {
      NODE_TLS_REJECT_UNAUTHORIZED: "0",
    },
    fileParallelism: false,
    globalSetup: path.resolve(
      __dirname,
      "src/characterization/global-setup.ts",
    ),
    hookTimeout: 180_000,
    include: ["src/characterization/approval/**/*.test.ts"],
    testTimeout: 60_000,
  },
});
