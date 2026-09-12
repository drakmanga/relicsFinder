import { describe, expect, it } from "vitest";

import { isReload } from "./pageLoad";

/** Only the fields the reading looks at; the real entry carries thirty more. */
const entry = (type: string) => ({ type }) as PerformanceNavigationTiming;

describe("isReload", () => {
  it("says yes to a reload", () => {
    expect(isReload([entry("reload")])).toBe(true);
  });

  it("says no to a first visit or a followed link", () => {
    expect(isReload([entry("navigate")])).toBe(false);
  });

  it("says no to the back and forward buttons", () => {
    expect(isReload([entry("back_forward")])).toBe(false);
  });

  it("says no to a page the browser prerendered", () => {
    expect(isReload([entry("prerender")])).toBe(false);
  });

  it("says no when the browser carries no navigation timing", () => {
    expect(isReload([])).toBe(false);
  });
});
