import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  root: __dirname,
  test: {
    globals: true,
    include: ["tests/**/*.test.ts"],
    setupFiles: ["tests/vitest.setup.ts"],
    environment: "node",
    pool: "forks",
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
