import { defineConfig, mergeConfig } from "vitest/config";

import baseConfig from "./vitest.config.mjs";

export default mergeConfig(
  baseConfig,
  defineConfig({
    test: {
      fileParallelism: false,
      include: ["src/characterization/**/*.characterization.ts"],
    },
  }),
);
