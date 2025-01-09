import { loadEnv, defineConfig } from "vite";

export default defineConfig({
  test: {
    env: loadEnv("example", process.cwd(), ""),
  },
});
