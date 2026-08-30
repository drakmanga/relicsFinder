import { describe, expect, it } from "vitest";

import { tierTrendCell, trendCell } from "./trend";
import type { ItemPrice, TrendGap } from "../api/types";

function price(trend: number | null, trendGap?: TrendGap | null): ItemPrice {
  return {
    itemName: "Volt Prime Neuroptics Blueprint",
    averagePrice: trend === null ? null : 27,
    median: null,
    volume: null,
    trend,
    trendGap,
    slug: "volt_prime_neuroptics_blueprint",
    ducats: null,
    setName: null,
    category: null,
  };
}

describe("trendCell", () => {
  it("shows the movement when there is one", () => {
    expect(trendCell(price(12.5))).toEqual({ kind: "moved", percent: 12.5 });
  });

  it("shows a movement of zero rather than treating it as missing", () => {
    // The bug this guards: `trend || ...` reads 0 as absent, and a price sitting
    // exactly on its ninety-day average is the one case that is measured AND
    // zero. It is an answer, and the arrow says so.
    expect(trendCell(price(0))).toEqual({ kind: "moved", percent: 0 });
  });

  it("waits for a part the price batch has no entry for", () => {
    expect(trendCell(undefined)).toEqual({ kind: "waiting" });
  });

  it("waits when neither a trend nor a reason has arrived", () => {
    // The distinguishing case for the whole file: an item the cache has not
    // reached comes back with both fields empty, and it must not be labelled.
    expect(trendCell(price(null))).toEqual({ kind: "waiting" });
    expect(trendCell(price(null, null))).toEqual({ kind: "waiting" });
  });

  it("names the cause the server sent", () => {
    expect(trendCell(price(null, "no-listings"))).toEqual({
      kind: "note",
      reason: "no-listings",
    });
    expect(trendCell(price(null, "too-few-sales"))).toEqual({
      kind: "note",
      reason: "too-few-sales",
    });
    expect(trendCell(price(null, "no-answer"))).toEqual({ kind: "note", reason: "no-answer" });
  });
});

describe("tierTrendCell", () => {
  it("shows the movement whether or not the batch has settled", () => {
    expect(tierTrendCell(14, true)).toEqual({ kind: "moved", percent: 14 });
    expect(tierTrendCell(14, false)).toEqual({ kind: "moved", percent: 14 });
  });

  it("says steady while the cache is still filling", () => {
    // Steady is computed from drops that were measured, so it does not become
    // truer or falser as the rest of the batch lands. Only the absence waits.
    expect(tierTrendCell("steady", true)).toEqual({ kind: "note", reason: "steady" });
  });

  it("waits rather than saying there is nothing to compare", () => {
    // A relic whose drops have no prices YET looks exactly like a relic whose
    // drops have no measured trend, and one of those is a fact about the market
    // while the other is a fact about the clock.
    expect(tierTrendCell("no-baseline", true)).toEqual({ kind: "waiting" });
  });

  it("says there is nothing to compare once the batch has settled", () => {
    expect(tierTrendCell("no-baseline", false)).toEqual({
      kind: "note",
      reason: "no-baseline",
    });
  });
});
