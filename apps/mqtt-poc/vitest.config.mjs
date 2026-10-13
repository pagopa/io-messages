import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: { reporter: ["lcov", "text"] },
    include: ["src/**/__tests__/*.test.ts"],
  },
});
