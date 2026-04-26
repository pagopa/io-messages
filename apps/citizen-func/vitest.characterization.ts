import { defineConfig } from "vitest/config";

// Opt-in characterization config. Run explicitly via:
//   pnpm --filter citizen-func characterization:record
//   pnpm --filter citizen-func characterization:verify
export default defineConfig({
  test: {
    // Disable TLS validation in test workers so the Cosmos emulator's
    // self-signed certificate does not reject connections.
    env: {
      NODE_TLS_REJECT_UNAUTHORIZED: "0",
    },
    globalSetup: "./src/characterization/global-setup.ts",
    include: ["src/characterization/approval/**/*.test.ts"],
    // Shared containers take time; allow generous per-test and suite timeouts.
    hookTimeout: 300_000,
    testTimeout: 60_000,
  },
});
