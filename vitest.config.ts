import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    // Phase 0 adds vitest with no tests yet; later phases add unit tests for
    // shuffle/matchmaker logic (§7, §9 Phase 4/5) under this same config.
    passWithNoTests: true,
  },
});
