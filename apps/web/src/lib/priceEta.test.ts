import { describe, expect, it } from "vitest";

import { etaMs, formatEta, type Sample } from "./priceEta";

/** Readings a poll apart, at a steady number of prices per poll. */
const steady = (readings: number[], total: number, everyMs = 15_000): Sample[] =>
  readings.map((priced, index) => ({ at: 1_000_000 + index * everyMs, priced, total }));

describe("etaMs", () => {
  it("divides what is left by the rate measured so far", () => {
    // 100 prices over 30s. The target is 95% of 1000, so 950 — 850 still to
    // come, which is 8.5 lots of the 100-per-30-seconds just measured.
    const samples = steady([0, 50, 100], 1000);

    expect(etaMs(samples, 1000)).toBeCloseTo(8.5 * 30_000, -2);
  });

  it("stops short of the prices that never arrive", () => {
    // 950 of 1000 is where the poll gives up, so at 950 there is nothing left
    // to wait for even though fifty names have no price.
    const samples = steady([900, 925, 950], 1000);

    expect(etaMs(samples, 1000)).toBeNull();
  });

  it("says nothing from a single reading", () => {
    expect(etaMs(steady([100], 1000), 1000)).toBeNull();
  });

  it("says nothing when two readings are too close together", () => {
    const samples: Sample[] = [
      { at: 1_000_000, priced: 100, total: 1000 },
      { at: 1_001_000, priced: 140, total: 1000 },
    ];

    expect(etaMs(samples, 1000)).toBeNull();
  });

  it("says nothing while the counter is not moving", () => {
    // A queue that has stalled has no rate, and dividing by it would answer
    // Infinity — which formats into a number the reader would believe.
    expect(etaMs(steady([100, 100, 100], 1000), 1000)).toBeNull();
  });

  it("says nothing about an empty batch", () => {
    expect(etaMs(steady([0, 0], 0), 0)).toBeNull();
  });

  it("follows the recent rate rather than the whole session", () => {
    // The window is applied by the hook; what this checks is that the maths
    // reads the ends of whatever window it is given. Same prices in, twice the
    // time to get them, so twice as long to finish the rest.
    const fast = steady([0, 100], 1000, 15_000);
    const slow = steady([0, 100], 1000, 30_000);

    expect(etaMs(slow, 1000)! / etaMs(fast, 1000)!).toBeCloseTo(2, 5);
  });
});

describe("formatEta", () => {
  it("passes null straight through", () => {
    expect(formatEta(null)).toBeNull();
  });

  it("never says about zero minutes", () => {
    expect(formatEta(20_000)).toBe("under a minute left");
  });

  it("rounds to whole minutes", () => {
    expect(formatEta(4 * 60_000 + 10_000)).toBe("about 4 minutes left");
  });

  it("keeps the singular for one", () => {
    expect(formatEta(70_000)).toBe("about 1 minute left");
  });

  it("stops claiming precision past a quarter of an hour", () => {
    expect(formatEta(40 * 60_000)).toBe("over 15 minutes left");
  });
});
