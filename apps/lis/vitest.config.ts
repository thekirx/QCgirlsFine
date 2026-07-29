import path from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": path.join(currentDirectory, "src"),
    },
  },
  test: {
    environment: "node",
    fileParallelism: false,
    sequence: {
      concurrent: false,
    },
  },
});
