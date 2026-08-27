import { describe, expect, it } from "vitest";

import {
  buildTierList,
  medianOf,
  tierFor,
  RADSHARE_PLAYERS,
  SELL_BADGE_MIN_TRADES,
  TIER_LETTERS,
  TREND_ARROW_THRESHOLD,
} from "./tierList";
import { prices, relic, reward } from "./testing";
import type { PriceMap, Relic, RelicPriceMap, Reward, Tier } from "../api/types";

/** A single drop, so an expected value is `chance/100 × price` and nothing else. */
const drop = (itemName: string, chance: number) => reward({ itemName, chance });

/** One relic in the two states this view reads, and only those two. */
function twoStates(fullName: string, intact: Reward[], radiant: Reward[], tier: Tier = "lith") {
  return [
    relic({ fullName, tier, refinement: "intact", rewards: intact }),
    relic({ fullName, tier, refinement: "radiant", rewards: radiant }),
  ];
}

/** The same relic list in both states, for cases where the two columns need not differ. */
const mirrored = (fullName: string, rewards: Reward[], tier: Tier = "lith") =>
  twoStates(fullName, rewards, rewards, tier);

/** `{ "Lith V9": [price, trades] }`, since the badge reads both together. */
const relicMarket = (entries: Record<string, [number | null, number | null]>): RelicPriceMap =>
  new Map(
    Object.entries(entries).map(([relicName, [averagePrice, tradeCount90d]]) => [
      relicName,
      { relicName, averagePrice, tradeCount90d },
    ]),
  );

/**
 * `testing.ts`'s builder leaves every trend null, which is the right default
 * for the rest of the suite and the one thing the arrow cannot be tested with.
 */
const withTrends = (map: PriceMap, trends: Record<string, number>): PriceMap => {
  const patched = new Map(map);

  for (const [itemName, trend] of Object.entries(trends)) {
    const item = patched.get(itemName);
    if (item) patched.set(itemName, { ...item, trend });
  }

  return patched;
};

describe("medianOf", () => {
  it("takes the middle of an odd population", () => {
    expect(medianOf([5, 1, 3])).toBe(3);
  });

  it("takes the mean of the two middles of an even one", () => {
    // Not the lower of the pair: that biases every band boundary downwards by
    // half a gap, and makes the boundaries move with the parity of the count.
    expect(medianOf([1, 2, 3, 4])).toBe(2.5);
  });

  it("sorts numerically, not the way strings sort", () => {
    // The default comparator answers 100 here, which would triple the median.
    expect(medianOf([10, 9, 100])).toBe(10);
  });

  it("leaves the caller's array alone", () => {
    const values = [3, 1, 2];
    medianOf(values);

    expect(values).toEqual([3, 1, 2]);
  });

  it("has no answer for an empty population", () => {
    // Zero would be a claim about the relics, and every value clears twice zero.
    expect(medianOf([])).toBeNull();
  });
});

describe("tierFor", () => {
  it("puts each boundary in the band above it", () => {
    // Inclusive at the bottom: exactly twice the median is S, not A. The bands
    // partition the range, so each one owns its own lower edge.
    expect(tierFor(20, 10)).toBe("S");
    expect(tierFor(15, 10)).toBe("A");
    expect(tierFor(12, 10)).toBe("B");
    expect(tierFor(8, 10)).toBe("C");
    expect(tierFor(6, 10)).toBe("D");
  });

  it("drops a band the moment a value falls under a boundary", () => {
    expect(tierFor(19.999, 10)).toBe("A");
    expect(tierFor(14.999, 10)).toBe("B");
    expect(tierFor(11.999, 10)).toBe("C");
    expect(tierFor(7.999, 10)).toBe("D");
    expect(tierFor(5.999, 10)).toBe("F");
  });

  it("scales with the median rather than with a fixed platinum figure", () => {
    // The same relic, ranked against two different populations. This is what a
    // percentile scheme cannot do without cutting through the 327 relics packed
    // between 4p and 6p.
    expect(tierFor(10, 5)).toBe("S");
    expect(tierFor(10, 100)).toBe("F");
  });

  it("puts the median relic itself in C", () => {
    // C runs 0.8x to 1.2x and holds roughly 45% of the catalogue. That is the
    // honest answer, not a bug: nearly half the relics are worth about what the
    // median relic is worth.
    expect(tierFor(10, 10)).toBe("C");
  });

  it("refuses to letter anything without a median", () => {
    expect(tierFor(10, null)).toBeNull();
    // A median of zero gives every band the same boundary, so every relic would
    // be handed an S.
    expect(tierFor(10, 0)).toBeNull();
    expect(tierFor(0, 0)).toBeNull();
  });

  it("has six letters and no E", () => {
    expect(TIER_LETTERS).toEqual(["S", "A", "B", "C", "D", "F"]);
  });
});

describe("the two columns", () => {
  const market = prices({ "intact-only": 40, "radiant-only": 7, rare: 500, common: 10 });

  it("reads Intact for solo and Radiant for the radshare", () => {
    // Different item sets per state, so swapping the two columns swaps the two
    // numbers rather than leaving them alike.
    const { rows } = buildTierList(
      twoStates("Lith V9", [drop("intact-only", 100)], [drop("radiant-only", 100)]),
      market,
      undefined,
      undefined,
      "all",
    );

    expect(rows[0]?.soloValue).toBeCloseTo(40, 10);
    expect(rows[0]?.radshareValue).toBeCloseTo(7, 10);
  });

  it("pays the radshare column the best of four rolls, not the average of one", () => {
    const { rows } = buildTierList(
      twoStates("Lith V9", [drop("rare", 2)], [drop("rare", 10)]),
      market,
      undefined,
      undefined,
      "all",
    );

    // 500 × (1 − 0.9⁴) = 171.95. A plain expected value answers 50, and a
    // squad of one answers 50 as well.
    expect(RADSHARE_PLAYERS).toBe(4);
    expect(rows[0]?.radshareValue).toBeCloseTo(171.95, 8);
    expect(rows[0]?.soloValue).toBeCloseTo(10, 10);
  });

  it("gives one relic two different letters, which is why there are two columns", () => {
    // Three relics worth the same solo. One of them holds a rare that a squad
    // of four reaches often enough to change everything about it.
    const catalogue = [
      ...mirrored("Lith A1", [drop("common", 100)]),
      ...twoStates("Lith A2", [drop("common", 100)], [drop("rare", 10)]),
      ...mirrored("Lith A3", [drop("common", 100)]),
    ];
    const { rows, soloMedian, radshareMedian } = buildTierList(
      catalogue,
      market,
      undefined,
      undefined,
      "all",
    );

    expect(soloMedian).toBeCloseTo(10, 10);
    expect(radshareMedian).toBeCloseTo(10, 10);
    expect(rows.map((row) => row.soloLetter)).toEqual(["C", "C", "C"]);
    expect(rows.map((row) => row.radshareLetter)).toEqual(["C", "S", "C"]);
  });

  it("ranks each column against its own median", () => {
    // Best-of-four pays about three times what one roll does, so a single
    // median would put the whole radshare column in S and the whole solo column
    // in F. Here the two columns are ten times apart and the letters come out
    // the same, which is the point: a letter says where a relic sits among the
    // relics in its own column.
    const scale = prices({ s10: 10, s20: 20, s30: 30, r100: 100, r200: 200, r300: 300 });
    const catalogue = [
      ...twoStates("Lith A1", [drop("s10", 100)], [drop("r100", 100)]),
      ...twoStates("Lith A2", [drop("s20", 100)], [drop("r200", 100)]),
      ...twoStates("Lith A3", [drop("s30", 100)], [drop("r300", 100)]),
    ];
    const { rows, soloMedian, radshareMedian } = buildTierList(
      catalogue,
      scale,
      undefined,
      undefined,
      "all",
    );

    expect(soloMedian).toBe(20);
    expect(radshareMedian).toBe(200);
    expect(rows.map((row) => row.soloLetter)).toEqual(["F", "C", "A"]);
    expect(rows.map((row) => row.radshareLetter)).toEqual(["F", "C", "A"]);
  });

  it("ignores a relic the catalogue only carries in a state neither column reads", () => {
    const catalogue = [
      ...mirrored("Lith A1", [drop("common", 100)]),
      relic({ fullName: "Lith A2", refinement: "flawless", rewards: [drop("rare", 100)] }),
    ];
    const { rows, soloMedian } = buildTierList(catalogue, market, undefined, undefined, "all");

    // Not a zero-value row dragging the median down with it.
    expect(rows.map((row) => row.relicFullName)).toEqual(["Lith A1"]);
    expect(soloMedian).toBe(10);
  });

  it("has no letters at all before the prices land", () => {
    const { rows, soloMedian } = buildTierList(
      mirrored("Lith V9", [drop("common", 100)]),
      undefined,
      undefined,
      undefined,
      "all",
    );

    expect(soloMedian).toBe(0);
    expect(rows[0]?.soloLetter).toBeNull();
    expect(rows[0]?.radshareLetter).toBeNull();
  });

  it("counts a drop nobody is selling as zero rather than dropping the relic", () => {
    // Forma is in 544 of 771 relics and really is worth no platinum, being
    // untradeable. It gets no special case; it simply contributes nothing.
    const { rows } = buildTierList(
      mirrored("Lith V9", [drop("common", 50), drop("Forma Blueprint", 50)]),
      market,
      undefined,
      undefined,
      "all",
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]?.soloValue).toBeCloseTo(5, 10);
  });

  it("lists a relic once, however many states it arrives in", () => {
    const fourStates: Relic[] = [
      ...mirrored("Lith V9", [drop("common", 100)]),
      relic({ fullName: "Lith V9", refinement: "exceptional", rewards: [drop("rare", 100)] }),
      relic({ fullName: "Lith V9", refinement: "flawless", rewards: [drop("rare", 100)] }),
    ];
    const { rows } = buildTierList(fourStates, market, undefined, undefined, "all");

    expect(rows).toHaveLength(1);
    // The two states nobody asked for must not have leaked into either column.
    expect(rows[0]?.soloValue).toBeCloseTo(10, 10);
    expect(rows[0]?.radshareValue).toBeCloseTo(10, 10);
  });

  it("sorts by relic name, so neither column decides the order", () => {
    const catalogue = [
      ...mirrored("Lith V10", [drop("common", 100)]),
      ...mirrored("Lith V2", [drop("common", 100)]),
    ];
    const { rows } = buildTierList(catalogue, market, undefined, undefined, "all");

    expect(rows.map((row) => row.relicFullName)).toEqual(["Lith V2", "Lith V10"]);
  });
});

describe("the population the median is taken over", () => {
  // Seven relics, each with one drop it always gives, so a solo value is the
  // price and nothing else. Three are still dropping; four are vaulted, and
  // they are the expensive ones — which is the shape of the real catalogue,
  // where only 34 of 772 relics are farmable and they cluster at the bottom.
  const market = prices({ f1: 10, f2: 5, f3: 2, v1: 100, v2: 200, v3: 300, v4: 400 });
  const catalogue = [
    ...mirrored("Lith F1", [drop("f1", 100)]),
    ...mirrored("Lith F2", [drop("f2", 100)]),
    ...mirrored("Lith F3", [drop("f3", 100)]),
    ...mirrored("Lith V1", [drop("v1", 100)]),
    ...mirrored("Lith V2", [drop("v2", 100)]),
    ...mirrored("Lith V3", [drop("v3", 100)]),
    ...mirrored("Lith V4", [drop("v4", 100)]),
  ];
  const stillDropping = new Set(["Lith F1", "Lith F2", "Lith F3"]);

  const lettersOf = (vault: "all" | "farmable" | "vaulted") => {
    const { rows, soloMedian, radshareMedian } = buildTierList(
      catalogue,
      market,
      undefined,
      stillDropping,
      vault,
    );
    return {
      soloMedian,
      radshareMedian,
      letters: new Map(rows.map((row) => [row.relicFullName, row.soloLetter])),
    };
  };

  it("ranks the whole catalogue against the whole catalogue", () => {
    const { soloMedian, radshareMedian, letters } = lettersOf("all");

    expect(soloMedian).toBe(100);
    expect(radshareMedian).toBe(100);
    expect(letters.size).toBe(7);
    expect(letters.get("Lith F1")).toBe("F");
    expect(letters.get("Lith V4")).toBe("S");
  });

  it("re-medians over the farmable relics, so they are not all D and F", () => {
    // The same relic, unchanged, on the same prices. Against the whole
    // catalogue Lith F1 is the worst thing on the list; against the relics
    // anyone can actually farm it is twice the median and the best of them.
    const { soloMedian, letters } = lettersOf("farmable");

    expect(soloMedian).toBe(5);
    expect(letters.size).toBe(3);
    expect(letters.get("Lith F1")).toBe("S");
    expect(letters.get("Lith F2")).toBe("C");
    expect(letters.get("Lith F3")).toBe("F");
    expect(letters.has("Lith V1")).toBe(false);
  });

  it("re-medians over the vaulted relics too, and averages the two middles", () => {
    // Four relics, so the median is (200 + 300) / 2 = 250. Taking the lower
    // middle would answer 200, and Lith V2 would read B rather than C.
    const { soloMedian, letters } = lettersOf("vaulted");

    expect(soloMedian).toBe(250);
    expect(letters.size).toBe(4);
    expect(letters.get("Lith V1")).toBe("F");
    expect(letters.get("Lith V2")).toBe("C");
    expect(letters.get("Lith V3")).toBe("B");
    expect(letters.get("Lith V4")).toBe("A");
    expect(letters.has("Lith F1")).toBe(false);
  });

  it("keeps everything while the rotation has not arrived", () => {
    // An empty tab for as long as that request takes would be worse than an
    // unfiltered one: the honest answer to "which are farmable" is not yet known.
    const { rows } = buildTierList(catalogue, market, undefined, undefined, "farmable");

    expect(rows).toHaveLength(7);
  });

  it("letters nothing when the filter empties the screen", () => {
    const { rows, soloMedian, radshareMedian } = buildTierList(
      catalogue,
      market,
      undefined,
      new Set<string>(),
      "farmable",
    );

    expect(rows).toEqual([]);
    expect(soloMedian).toBeNull();
    expect(radshareMedian).toBeNull();
  });
});

describe("the sell badge", () => {
  const market = prices({ common: 10, rare: 500 });
  const catalogue = mirrored("Lith V9", [drop("common", 100)]);

  // The relic is worth 10p opened solo, so 30p is plainly worth selling — the
  // only question these cases ask is whether the badge is allowed to say so.
  const badgeOn = (price: number | null, trades: number | null) =>
    buildTierList(catalogue, market, relicMarket({ "Lith V9": [price, trades] }), undefined, "all")
      .rows[0]?.worthSelling;

  it("appears at the trade threshold and not one trade below it", () => {
    expect(SELL_BADGE_MIN_TRADES).toBe(10);
    expect(badgeOn(30, 10)).toBe(true);
    expect(badgeOn(30, 9)).toBe(false);
  });

  it("stays off where the trade count is unknown", () => {
    // Null means nobody has asked yet, not that nobody traded. Reading it as
    // zero would keep the badge off for the wrong reason; reading it as "no
    // objection" would put it on a price backed by nothing.
    expect(badgeOn(30, null)).toBe(false);
  });

  it("stays off when opening the relic pays more than selling it", () => {
    expect(badgeOn(3, 25)).toBe(false);
  });

  it("stays off on a tie, since neither choice is better", () => {
    expect(badgeOn(10, 25)).toBe(false);
    expect(badgeOn(10.01, 25)).toBe(true);
  });

  it("measures against opening the relic solo, not against the radshare", () => {
    // Worth 10p opened alone and 171.95p opened in a squad of four. A 30p
    // listing beats the first and loses to the second, and the badge answers
    // the first: the radshare number has a hundred void traces missing from it,
    // and an un-subtracted cost must not be what decides whether the badge
    // appears.
    const { rows } = buildTierList(
      twoStates("Lith V9", [drop("common", 100)], [drop("rare", 10)]),
      market,
      relicMarket({ "Lith V9": [30, 25] }),
      undefined,
      "all",
    );

    expect(rows[0]?.radshareValue).toBeCloseTo(171.95, 8);
    expect(rows[0]?.worthSelling).toBe(true);
  });

  it("stays off where nobody is selling the relic at all", () => {
    expect(badgeOn(null, 25)).toBe(false);
    expect(
      buildTierList(catalogue, market, undefined, undefined, "all").rows[0]?.worthSelling,
    ).toBe(false);
  });

  it("does not let the relic's own price move the letter", () => {
    // A 400p relic and a 3p relic, worth exactly the same opened. The price is
    // beside the letter and never inside it — a tier list that ranked relics by
    // what they cost would be a price list.
    const pair = [
      ...mirrored("Lith A1", [drop("common", 100)]),
      ...mirrored("Lith A2", [drop("common", 100)]),
    ];
    const { rows } = buildTierList(
      pair,
      market,
      relicMarket({ "Lith A1": [400, 25], "Lith A2": [3, 25] }),
      undefined,
      "all",
    );

    expect(rows.map((row) => row.soloLetter)).toEqual(["C", "C"]);
    expect(rows.map((row) => row.relicPrice)).toEqual([400, 3]);
    expect(rows.map((row) => row.worthSelling)).toEqual([true, false]);
  });
});

describe("the ninety-day trend", () => {
  const trendOf = (rewards: Reward[], market: PriceMap) =>
    buildTierList(mirrored("Lith V9", rewards), market, undefined, undefined, "all").rows[0]?.trend;

  const one = [drop("common", 100)];

  it("reports a rise that clears the gate", () => {
    // 10p standing 25% above its ninety-day average puts that average at 8p,
    // and 8p to 10p is a 25% rise.
    expect(trendOf(one, withTrends(prices({ common: 10 }), { common: 25 }))).toBeCloseTo(25, 8);
  });

  it("reports a fall that clears the gate", () => {
    // 10p standing 25% below puts the average at 13.33p, a 25% fall.
    expect(trendOf(one, withTrends(prices({ common: 10 }), { common: -25 }))).toBeCloseTo(-25, 8);
  });

  it("says nothing about a move too small to act on", () => {
    expect(trendOf(one, withTrends(prices({ common: 10 }), { common: 5 }))).toBeNull();
    expect(trendOf(one, withTrends(prices({ common: 10 }), { common: -5 }))).toBeNull();
  });

  it("shows an arrow at exactly the threshold, in both directions", () => {
    // 11p standing 10% above its average puts that average at exactly 10p, and
    // 9p standing 10% below puts it at exactly 10p as well. Both land on the
    // threshold rather than a rounding step either side of it, and the gate is
    // inclusive — like the band boundaries.
    expect(TREND_ARROW_THRESHOLD).toBe(10);
    expect(trendOf(one, withTrends(prices({ common: 11 }), { common: 10 }))).toBe(10);
    expect(trendOf(one, withTrends(prices({ common: 9 }), { common: -10 }))).toBe(-10);
  });

  it("says nothing when no drop has a trend", () => {
    expect(trendOf(one, prices({ common: 10 }))).toBeNull();
  });

  it("keeps a drop with no trend in the comparison instead of dropping it", () => {
    // Both drops at 50%: today 0.5 × 10 + 0.5 × 10 = 10, and ninety days ago
    // 0.5 × 8 + 0.5 × 10 = 9, an 11.1% rise. Leaving the untrended drop out
    // would compare a one-drop relic against a two-drop one and report the
    // missing drop as a 150% price movement.
    const market = withTrends(prices({ moved: 10, still: 10 }), { moved: 25 });

    expect(trendOf([drop("moved", 50), drop("still", 50)], market)).toBeCloseTo(11.111, 3);
  });

  it("survives a price standing at nothing against its average", () => {
    // A trend of exactly -100 divides by zero, and an infinite baseline poisons
    // the whole comparison — the answer comes back NaN, which the gate then
    // reads as "no movement" and nobody ever sees the bug. Paired here with a
    // drop that really did move, so the relic has an arrow to lose: the -100
    // drop keeps its current price as its own baseline and the other one still
    // reports its 11.1%.
    const market = withTrends(prices({ gone: 10, moved: 10 }), { gone: -100, moved: 25 });

    expect(trendOf([drop("gone", 50), drop("moved", 50)], market)).toBeCloseTo(11.111, 3);
  });

  it("says nothing about a relic that was worth nothing ninety days ago", () => {
    const market = withTrends(prices({ common: null }), { common: 25 });

    expect(trendOf(one, market)).toBeNull();
  });
});
