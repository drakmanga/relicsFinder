import { describe, expect, it } from "vitest";

import { REFRESH_FLOOR_MS, shouldRefetchPrices } from "./priceRefresh";

const NOW = 1_756_000_000_000;

describe("shouldRefetchPrices", () => {
  it("does nothing on the first marker a tab sees", () => {
    // The prices that arrived with it ARE that marker's answer. Fetching them
    // again would double the cost of opening the app.
    expect(shouldRefetchPrices(null, 42, 0, NOW)).toBe(false);
  });

  it("does nothing while the marker holds still", () => {
    // The whole point of a marker: a quiet backend costs an open tab nothing.
    expect(shouldRefetchPrices(42, 42, NOW - REFRESH_FLOOR_MS, NOW)).toBe(false);
  });

  it("re-reads once the marker has moved", () => {
    expect(shouldRefetchPrices(42, 43, NOW - REFRESH_FLOOR_MS, NOW)).toBe(true);
  });

  it("holds a tab to one re-read every five minutes", () => {
    // The marker moves a few times a minute — 1.500 prices, a warmer that
    // re-reads about 3.400 of them a day — and each re-read is six hundred
    // prices over the wire.
    expect(shouldRefetchPrices(42, 43, NOW - REFRESH_FLOOR_MS + 1, NOW)).toBe(false);
    expect(shouldRefetchPrices(42, 43, NOW - REFRESH_FLOOR_MS, NOW)).toBe(true);
  });

  it("keeps a change the floor held back", () => {
    // The floor answers no and the caller leaves `seen` where it is, so the
    // same change is still pending at the next poll rather than lost to it.
    expect(shouldRefetchPrices(42, 43, NOW, NOW)).toBe(false);
    expect(shouldRefetchPrices(42, 43, NOW, NOW + REFRESH_FLOOR_MS)).toBe(true);
  });

  it("says nothing before the status query has answered", () => {
    expect(shouldRefetchPrices(null, undefined, 0, NOW)).toBe(false);
    expect(shouldRefetchPrices(42, undefined, 0, NOW)).toBe(false);
  });
});
