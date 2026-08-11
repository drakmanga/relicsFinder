import { describe, expect, it } from "vitest";

import { buildSets, verdictFor } from "./setCompletion";
import { prices, relic, reward } from "./testing";
import type { SetPart } from "./setCompletion";

const catalogue = [
  relic({
    fullName: "Lith V9",
    refinement: "intact",
    rewards: [
      reward({ itemName: "Volt Prime Blueprint", rarity: "rare", chance: 2 }),
      reward({ itemName: "Volt Prime Chassis Blueprint", rarity: "common", chance: 25 }),
      reward({ itemName: "Forma Blueprint", rarity: "common", chance: 25 }),
    ],
  }),
  relic({
    fullName: "Axi A1",
    tier: "axi",
    refinement: "intact",
    rewards: [reward({ itemName: "Volt Prime Blueprint", rarity: "rare", chance: 10 })],
  }),
];

const market = prices({
  "Volt Prime Blueprint": 100,
  "Volt Prime Chassis Blueprint": 20,
  "Forma Blueprint": null,
});

const relicMarket = new Map<string, number | null>([
  ["Lith V9", 10],
  ["Axi A1", 10],
]);

describe("buildSets", () => {
  it("groups the parts that share a set, and leaves Forma out of every set", () => {
    const [volt, ...rest] = buildSets(catalogue, new Set(), market, relicMarket, "intact");

    expect(volt?.setName).toBe("Volt Prime");
    expect(volt?.parts.map((p) => p.itemName)).toEqual([
      "Volt Prime Blueprint",
      "Volt Prime Chassis Blueprint",
    ]);
    expect(rest).toHaveLength(0);
  });

  it("takes membership from Intact only, so a part is not counted four times", () => {
    const withStates = [
      ...catalogue,
      relic({
        fullName: "Lith V9",
        refinement: "radiant",
        rewards: [reward({ itemName: "Volt Prime Blueprint", rarity: "rare", chance: 20 })],
      }),
    ];
    const [volt] = buildSets(withStates, new Set(), market, relicMarket, "intact");

    expect(volt?.parts).toHaveLength(2);
  });

  it("picks the relic with the best odds at the refinement asked about", () => {
    const [volt] = buildSets(catalogue, new Set(), market, relicMarket, "intact");
    const blueprint = volt?.parts.find((p) => p.itemName === "Volt Prime Blueprint");

    expect(blueprint?.bestRelic).toBe("Axi A1");
    expect(blueprint?.bestChance).toBe(10);
    // 1/p, the mean of a geometric distribution.
    expect(blueprint?.runs).toBeCloseTo(10, 10);
  });

  it("counts what is owned and totals only what is missing", () => {
    const [volt] = buildSets(
      catalogue,
      new Set(["Volt Prime Chassis Blueprint"]),
      market,
      relicMarket,
      "intact",
    );

    expect(volt?.ownedCount).toBe(1);
    expect(volt?.missingCost).toBe(100);
  });

  it("flags a total that understates because a price is missing", () => {
    // A missing price is not a free part: without the flag a total that reads
    // low is mistaken for a bargain.
    const withUnlisted = [
      relic({
        refinement: "intact",
        rewards: [
          reward({ itemName: "Ash Prime Blueprint" }),
          reward({ itemName: "Ash Prime Helmet Blueprint" }),
        ],
      }),
    ];
    const partial = prices({ "Ash Prime Blueprint": 50, "Ash Prime Helmet Blueprint": null });
    const [ash] = buildSets(withUnlisted, new Set(), partial, relicMarket, "intact");

    expect(ash?.costIncomplete).toBe(true);
    expect(ash?.missingCost).toBe(50);
  });

  it("subtracts what the runs hand back from the cost of farming", () => {
    // runs × (relicPrice − expectedValue) + price. Without the subtraction the
    // verdict was "buy" for 578 parts out of 596, which is a verdict that says
    // nothing.
    const [volt] = buildSets(catalogue, new Set(), market, relicMarket, "intact");
    const chassis = volt?.parts.find((p) => p.itemName === "Volt Prime Chassis Blueprint");

    // Lith V9 is the only source of the chassis: 25% odds, so four runs.
    // Its expected value is 0.02 × 100 + 0.25 × 20 = 7, against a 10p relic.
    // 4 × (10 − 7) + 20 = 32.
    expect(chassis?.netFarmCost).toBeCloseTo(32, 8);
  });

  it("leaves the farm cost undecided when a relic has no price", () => {
    const [volt] = buildSets(catalogue, new Set(), market, undefined, "intact");

    expect(volt?.parts.every((p) => p.netFarmCost === null)).toBe(true);
  });
});

describe("verdictFor", () => {
  const part = (overrides: Partial<SetPart>): SetPart => ({
    itemName: "Volt Prime Blueprint",
    owned: false,
    price: 100,
    bestRelic: "Lith V9",
    bestChance: 2,
    runs: 50,
    netFarmCost: 200,
    ...overrides,
  });

  it("says buy when buying costs less", () => {
    expect(verdictFor(part({ price: 100, netFarmCost: 200 }))).toBe("buy");
  });

  it("says farm when farming costs less", () => {
    expect(verdictFor(part({ price: 300, netFarmCost: 200 }))).toBe("farm");
  });

  it("says buy on a tie, because platinum is certain and runs are not", () => {
    expect(verdictFor(part({ price: 200, netFarmCost: 200 }))).toBe("buy");
  });

  it("refuses to answer when either number is missing", () => {
    // An unlisted part is not a cheap one, and this is exactly where a
    // confident wrong answer costs somebody an evening.
    expect(verdictFor(part({ price: null }))).toBe("unknown");
    expect(verdictFor(part({ netFarmCost: null }))).toBe("unknown");
  });
});
