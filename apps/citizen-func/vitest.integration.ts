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
    globalSetup: path.resolve(__dirname, "src/live-tests/global-setup.ts"),
    hookTimeout: 180_000,
    include: ["src/integration/**/*.test.ts"],
    testTimeout: 60_000,
  },
});
