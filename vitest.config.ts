import { defineConfig } from "vitest/config";

/**
 * Unit tests, for the pure logic only.
 *
 * `lib/` is where the arithmetic lives — what a relic pays, what refining it
 * costs, which set a part belongs to — and none of it touches the DOM or the
 * network, so it runs in Node without a browser or a mock in sight. The
 * components are covered by the render check and by the axe and Playwright
 * passes in `scripts/`, which exercise a real page rather than a simulated one.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["apps/web/src/**/*.test.ts", "packages/ui/src/**/*.test.ts"],
    reporters: ["default"],
  },
});
