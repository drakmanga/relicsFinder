import { describe, expect, it } from "vitest";

import { rotationToAnnounce } from "./teshinAlert";

// The 50,000 Kuva week that began on Monday 2026-11-16, and the week after it.
const BUNDLE_WEEK = Date.UTC(2026, 10, 16);
const DURING = Date.UTC(2026, 10, 18, 9);
const AFTER = Date.UTC(2026, 10, 24, 9);

describe("rotationToAnnounce", () => {
  it("announces the bundle's week the first time it is seen", () => {
    expect(rotationToAnnounce(true, DURING, null)).toBe(BUNDLE_WEEK);
  });

  it("does not repeat a week already announced", () => {
    expect(rotationToAnnounce(true, DURING, BUNDLE_WEEK)).toBeNull();
  });

  it("announces the next rotation even though an earlier one was", () => {
    const eightWeeksEarlier = BUNDLE_WEEK - 8 * 7 * 86_400_000;
    expect(rotationToAnnounce(true, DURING, eightWeeksEarlier)).toBe(BUNDLE_WEEK);
  });

  it("says nothing outside the bundle's week", () => {
    expect(rotationToAnnounce(true, AFTER, null)).toBeNull();
  });

  it("says nothing while switched off", () => {
    expect(rotationToAnnounce(false, DURING, null)).toBeNull();
  });
});
