import { describe, expect, it } from "vitest";

import { buildTierList, TREND_ARROW_THRESHOLD } from "./tierList";
import { WIRE_ITEM_PRICES, WIRE_RELICS } from "./tierListPayload";
import { normalizeRelic } from "../api/normalize";
import type { ItemPrice, PriceMap } from "../api/types";

/**
 * The tier list, rebuilt the way the browser rebuilds it.
 *
 * Both steps are the app's own and neither is re-implemented here: the relics
 * go through `normalizeRelic`, which is what `api.allRelics` maps the response
 * with, and the prices go into the same one-line map `useItemPrices`'s `select`
 * builds. A test that hand-shaped either would be testing the shape it chose.
 */
const rowsFromPayload = () => {
  const relics = WIRE_RELICS.map(normalizeRelic);
  const prices: PriceMap = new Map(WIRE_ITEM_PRICES.map((p) => [p.itemName, p as ItemPrice]));

  return buildTierList(relics, prices, undefined, undefined, "all").rows;
};

const trendOf = (relicFullName: string) =>
  rowsFromPayload().find((row) => row.relicFullName === relicFullName)?.trend;

describe("the ninety-day trend, over the payload the browser receives", () => {
  /*
    Every expectation below was computed from the captured payload on its own,
    not read off the implementation: expected value is the sum of each drop's
    chance times its price, the ninety-day baseline divides each price by
    1 + trend/100, and the movement is the difference between the two over the
    baseline. Same arithmetic, arrived at independently, so a change that moves
    a number here has moved a claim about the market rather than a rounding.
  */
  it("reports the relics that climbed", () => {
    expect(trendOf("Axi C10")).toBeCloseTo(26.05, 1);
    expect(trendOf("Lith L5")).toBeCloseTo(22.18, 1);
  });

  it("reports the relics that fell", () => {
    expect(trendOf("Axi B9")).toBeCloseTo(-41.51, 1);
    expect(trendOf("Neo A16")).toBeCloseTo(-34.97, 1);
  });

  it("calls the relics that barely moved steady, and means it", () => {
    // Axi A1 moved 3.04% and Lith G1 3.40% on the day this was captured. The
    // gate is what keeps them quiet, so a fix that made the arrow appear by
    // lowering it would fail here rather than look like a success.
    //
    // These two are also the only place "steady" can be checked against real
    // prices: it is the answer for a relic whose drops were measured and held
    // still, and every part in this payload carries a trend.
    expect(trendOf("Axi A1")).toBe("steady");
    expect(trendOf("Lith G1")).toBe("steady");
    expect(TREND_ARROW_THRESHOLD).toBe(10);
  });

  it("does not answer Steady for the whole payload", () => {
    // The defect this file exists for: every relic reading Steady while the
    // prices behind them carried a trend. Four of these six moved, so a path
    // that drops the trend anywhere between the wire and the row comes back
    // with nothing to say about any of them.
    const moved = rowsFromPayload().filter((row) => typeof row.trend === "number");

    expect(moved).toHaveLength(4);
  });

  it("has a baseline for every relic in it", () => {
    // "Nothing to compare" is the honest answer where no drop was measured, and
    // it must not be the answer here: all thirty-one priced parts in the capture
    // carry a trend, so a path that lost the trends would turn six real
    // comparisons into six shrugs — the same defect as Steady, differently
    // worded.
    const rows = rowsFromPayload();

    expect(rows.filter((row) => row.trend === "no-baseline")).toHaveLength(0);
    expect(rows).toHaveLength(6);
  });

  it("was given prices that could have said something", () => {
    // Guards the guard. If the captured payload ever lost its trends — a
    // regenerated fixture, a merge that flattened it — every assertion above
    // would still pass by agreeing that nothing moved.
    //
    // Every priced part, rather than every part: the two Forma blueprints in
    // here have no price and no trend, because Forma is not sold. That is the
    // market's own shape and not a hole in the capture.
    const priced = WIRE_ITEM_PRICES.filter((price) => price.averagePrice !== null);

    expect(priced.length).toBe(31);
    expect(priced.every((price) => price.trend !== null)).toBe(true);
  });
});
