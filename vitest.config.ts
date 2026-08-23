import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      // Mirrors the `@/*` path in tsconfig.json. Test files import their own
      // module relatively, but the modules under test import each other by
      // alias, so vitest has to resolve it the same way tsc and next do.
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    // Phase 0 adds vitest with no tests yet; later phases add unit tests for
    // shuffle/matchmaker logic (§7, §9 Phase 4/5) under this same config.
    passWithNoTests: true,
  },
});
