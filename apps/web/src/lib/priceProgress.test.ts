import { describe, expect, it } from "vitest";

import { itemPriceProgress, relicPriceProgress } from "./priceProgress";
import type { ItemPrice, PriceMap, RelicPriceMap } from "../api/types";

/** Only the field this module reads; the rest of ItemPrice is beside the point. */
const listing = (averagePrice: number | null): ItemPrice =>
  ({ itemName: "x", averagePrice }) as ItemPrice;

const itemMap = (prices: (number | null)[]): PriceMap =>
  new Map(prices.map((price, index) => [`item ${index}`, listing(price)]));

const relicMap = (prices: (number | null)[]): RelicPriceMap =>
  new Map(prices.map((price, index) => [`relic ${index}`, price]));

describe("itemPriceProgress", () => {
  it("counts the prices that have arrived", () => {
    const progress = itemPriceProgress(itemMap([12, null, 40, null]), false);

    expect(progress.total).toBe(4);
    expect(progress.priced).toBe(2);
  });

  it("is still filling while half the batch is empty", () => {
    expect(itemPriceProgress(itemMap([12, null]), false).filling).toBe(true);
  });

  it("settles once only the untraded residue is left", () => {
    // Ninety-nine prices and one hole is 1%, under the 5% residue: the parts
    // nobody sells must not keep the tables shimmering for ever.
    const prices = [...Array(99).fill(1), null];

    expect(itemPriceProgress(itemMap(prices), false).filling).toBe(false);
  });

  it("keeps filling at exactly one price over the residue", () => {
    // 6 of 100 is over 5%, 5 of 100 is not. The boundary is where a rounding
    // slip would show up, and it decides between a skeleton and an em dash.
    const overResidue = [...Array(94).fill(1), ...Array(6).fill(null)];
    const atResidue = [...Array(95).fill(1), ...Array(5).fill(null)];

    expect(itemPriceProgress(itemMap(overResidue), false).filling).toBe(true);
    expect(itemPriceProgress(itemMap(atResidue), false).filling).toBe(false);
  });

  it("is filling when the first request is still in flight", () => {
    const progress = itemPriceProgress(undefined, true);

    expect(progress.filling).toBe(true);
    expect(progress.total).toBe(0);
  });

  it("is not filling when there is no request to wait for", () => {
    // A query with nothing to ask for is disabled, not pending. Reading that as
    // "waiting" would leave the status line up on views that never ask.
    expect(itemPriceProgress(undefined, false).filling).toBe(false);
  });

  it("is not filling over an empty batch", () => {
    expect(itemPriceProgress(itemMap([]), false).filling).toBe(false);
  });

  it("has settled when every price is in", () => {
    const progress = itemPriceProgress(itemMap([1, 2, 3]), false);

    expect(progress.filling).toBe(false);
    expect(progress.priced).toBe(3);
  });
});

describe("relicPriceProgress", () => {
  it("reads a map of bare numbers rather than listings", () => {
    const progress = relicPriceProgress(relicMap([15, null, null]), false);

    expect(progress.total).toBe(3);
    expect(progress.priced).toBe(1);
    expect(progress.filling).toBe(true);
  });

  it("is filling while its own first request is out", () => {
    expect(relicPriceProgress(undefined, true).filling).toBe(true);
  });
});
