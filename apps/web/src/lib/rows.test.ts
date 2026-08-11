import { describe, expect, it } from "vitest";

import {
  applyRelicPriceCeiling,
  applyVaultFilter,
  atLeastOnce,
  bestDropValue,
  bestRefinementByTrace,
  buildRelicRows,
  emptyFilters,
  expectedValue,
  matchesRelic,
  sortRelicRows,
  squadValue,
} from "./rows";
import { prices, relic, reward, sixRewards } from "./testing";
import type { RelicRow } from "../api/types";

const row = (overrides: Partial<RelicRow> = {}): RelicRow => ({
  id: "Lith V9|intact",
  tier: "lith",
  relicFullName: "Lith V9",
  refinement: "intact",
  rewards: sixRewards(["a", "b", "c", "d", "e", "f"]),
  ...overrides,
});

describe("matchesRelic", () => {
  it("matches on a substring", () => {
    expect(matchesRelic("Lith V9", "lith")).toBe(true);
    expect(matchesRelic("Lith V9", "v9")).toBe(true);
  });

  it("does not let a complete code run into a longer one", () => {
    // The bug this rule exists for: typing "axi a1" used to return A1 and the
    // sixty-six rows of A10 through A19.
    expect(matchesRelic("Axi A1", "axi a1")).toBe(true);
    expect(matchesRelic("Axi A10", "axi a1")).toBe(false);
    expect(matchesRelic("Axi A19", "axi a1")).toBe(false);
  });

  it("keeps matching while the code is still being typed", () => {
    // "axi a" ends mid-code and is plainly someone still typing: an earlier
    // version applied the digit rule unconditionally and returned nothing.
    expect(matchesRelic("Axi A1", "axi a")).toBe(true);
    expect(matchesRelic("Axi A10", "axi a")).toBe(true);
  });
});

describe("expectedValue", () => {
  it("weights every drop by its chance", () => {
    const rewards = [
      reward({ itemName: "cheap", chance: 25, rarity: "common" }),
      reward({ itemName: "dear", chance: 2, rarity: "rare" }),
    ];

    // 0.25 × 20 + 0.02 × 100 = 7
    expect(expectedValue(rewards, prices({ cheap: 20, dear: 100 }))).toBeCloseTo(7, 10);
  });

  it("counts an unpriced drop as zero rather than skipping the relic", () => {
    const rewards = [
      reward({ itemName: "known", chance: 50 }),
      reward({ itemName: "unknown", chance: 50 }),
    ];

    expect(expectedValue(rewards, prices({ known: 10, unknown: null }))).toBeCloseTo(5, 10);
  });

  it("is zero before the prices land", () => {
    expect(expectedValue(sixRewards(["a", "b", "c", "d", "e", "f"]), undefined)).toBe(0);
  });
});

describe("squadValue", () => {
  const rewards = [
    reward({ itemName: "rare", chance: 2 }),
    reward({ itemName: "common", chance: 98 }),
  ];
  const market = prices({ rare: 100, common: 10 });

  it("equals the plain expected value for one player", () => {
    expect(squadValue(rewards, market, 1)).toBeCloseTo(expectedValue(rewards, market), 10);
  });

  it("is the best of n rolls, not the average of them", () => {
    // Four players: the rare shows up if any of the four rolls it, so the
    // payout is 100 × (1 − 0.98⁴) + 10 × 0.98⁴.
    const rareInSquad = 1 - Math.pow(0.98, 4);
    const expectedFour = 100 * rareInSquad + 10 * Math.pow(0.98, 4);

    expect(squadValue(rewards, market, 4)).toBeCloseTo(expectedFour, 10);
  });

  it("rises with the squad, which is the whole reason radshare exists", () => {
    const solo = squadValue(rewards, market, 1);
    const four = squadValue(rewards, market, 4);

    expect(four).toBeGreaterThan(solo);
  });

  it("is zero for a squad of none", () => {
    expect(squadValue(rewards, market, 0)).toBe(0);
  });
});

describe("atLeastOnce", () => {
  it("is the chance itself for one roll", () => {
    expect(atLeastOnce(2, 1)).toBeCloseTo(2, 10);
  });

  it("compounds across rolls without ever reaching certainty", () => {
    expect(atLeastOnce(2, 4)).toBeCloseTo((1 - Math.pow(0.98, 4)) * 100, 10);
    expect(atLeastOnce(2, 4)).toBeLessThan(100);
  });
});

describe("bestDropValue", () => {
  it("is the most valuable drop, however unlikely", () => {
    const subject = row({
      rewards: [reward({ itemName: "cheap", chance: 25 }), reward({ itemName: "dear", chance: 2 })],
    });

    expect(bestDropValue(subject, prices({ cheap: 20, dear: 100 }))).toBe(100);
  });

  it("is null when nothing in the relic is listed", () => {
    const subject = row({ rewards: [reward({ itemName: "unlisted" })] });

    expect(bestDropValue(subject, prices({ unlisted: null }))).toBeNull();
  });
});

describe("applyRelicPriceCeiling", () => {
  const cheap = row({ id: "cheap", rewards: [reward({ itemName: "cheap" })] });
  const dear = row({ id: "dear", rewards: [reward({ itemName: "dear" })] });
  const unlisted = row({ id: "unlisted", rewards: [reward({ itemName: "unlisted" })] });
  const market = prices({ cheap: 5, dear: 500, unlisted: null });

  it("keeps what is under the ceiling", () => {
    const kept = applyRelicPriceCeiling([cheap, dear], 10, market);

    expect(kept.map((r) => r.id)).toEqual(["cheap"]);
  });

  it("keeps relics with nothing listed: that is missing data, not a price", () => {
    const kept = applyRelicPriceCeiling([unlisted], 10, market);

    expect(kept.map((r) => r.id)).toEqual(["unlisted"]);
  });

  it("does nothing with no ceiling, or before the prices land", () => {
    expect(applyRelicPriceCeiling([cheap, dear], null, market)).toHaveLength(2);
    expect(applyRelicPriceCeiling([cheap, dear], 10, undefined)).toHaveLength(2);
  });
});

describe("applyVaultFilter", () => {
  const inRotation = row({ id: "a", relicFullName: "Lith V9" });
  const vaulted = row({ id: "b", relicFullName: "Axi A1" });
  const unvaulted = new Set(["Lith V9"]);

  it("splits the list both ways", () => {
    expect(applyVaultFilter([inRotation, vaulted], "farmable", unvaulted).map((r) => r.id)).toEqual(
      ["a"],
    );
    expect(applyVaultFilter([inRotation, vaulted], "vaulted", unvaulted).map((r) => r.id)).toEqual([
      "b",
    ]);
  });

  it("passes everything through until the rotation is known", () => {
    // The honest answer to "which are droppable" is not yet known, and an empty
    // table for as long as that request takes is worse than an unfiltered one.
    expect(applyVaultFilter([inRotation, vaulted], "farmable", undefined)).toHaveLength(2);
  });
});

describe("buildRelicRows", () => {
  const catalogue = [
    relic({
      fullName: "Lith V9",
      refinement: "intact",
      rewards: sixRewards(["Volt Prime Blueprint"]),
    }),
    relic({
      fullName: "Lith V9",
      refinement: "radiant",
      rewards: sixRewards(["Volt Prime Blueprint"]),
    }),
    relic({
      fullName: "Axi A1",
      tier: "axi",
      refinement: "intact",
      rewards: sixRewards(["Forma Blueprint"]),
    }),
  ];

  it("reads one refinement, so a relic is not listed four times", () => {
    const rows = buildRelicRows(catalogue, { ...emptyFilters(), refinement: "intact" });

    expect(rows.map((r) => r.relicFullName)).toEqual(["Lith V9", "Axi A1"]);
  });

  it("keeps a relic when the search names something inside it", () => {
    const rows = buildRelicRows(catalogue, { ...emptyFilters(), term: "volt" });

    expect(rows.map((r) => r.relicFullName)).toEqual(["Lith V9"]);
  });

  it("does not trim the rewards to the matches", () => {
    // A relic that holds the Rare you want also holds five things you get
    // instead, and hiding them would misrepresent what opening it does.
    const rows = buildRelicRows(catalogue, { ...emptyFilters(), term: "volt" });

    expect(rows[0]?.rewards).toHaveLength(catalogue[0]?.rewards.length ?? 0);
  });

  it("ignores rarity, which cannot narrow a list of relics", () => {
    // Every relic holds three commons, two uncommons and one rare, so the
    // filter would keep all of them or, with all three off, all of them again.
    const withRarity = buildRelicRows(catalogue, {
      ...emptyFilters(),
      rarities: new Set(["rare"] as const),
    });

    expect(withRarity).toHaveLength(2);
  });
});

describe("sortRelicRows", () => {
  const market = prices({ dear: 100, cheap: 5 });
  const rows = [
    row({
      id: "b",
      relicFullName: "Lith B1",
      rewards: [reward({ itemName: "cheap", chance: 100 })],
    }),
    row({
      id: "a",
      relicFullName: "Lith A1",
      rewards: [reward({ itemName: "dear", chance: 100 })],
    }),
    row({ id: "c", relicFullName: "Lith C1", rewards: [reward({ itemName: "unpriced" })] }),
  ];

  it("sorts names naturally, so A10 follows A9", () => {
    const numbered = [
      row({ id: "10", relicFullName: "Lith A10" }),
      row({ id: "9", relicFullName: "Lith A9" }),
    ];

    expect(sortRelicRows(numbered, "relic", "asc", market).map((r) => r.id)).toEqual(["9", "10"]);
  });

  it("puts a relic with nothing listed last, whichever way the column points", () => {
    const down = sortRelicRows(rows, "value", "desc", market);
    const up = sortRelicRows(rows, "value", "asc", market);

    // Unknown is not the cheapest relic; it is unknown.
    expect(down.at(-1)?.id).toBe("c");
    expect(up.at(-1)?.id).toBe("c");
  });

  it("leaves the input untouched", () => {
    const before = rows.map((r) => r.id);
    sortRelicRows(rows, "value", "desc", market);

    expect(rows.map((r) => r.id)).toEqual(before);
  });
});

describe("bestRefinementByTrace", () => {
  it("is not always Radiant", () => {
    // A relic whose rare is cheap: refining moves chance off the commons and
    // onto a rare that is worth less than what it displaced, so the hundred
    // traces of a Radiant buy less than the twenty-five of an Exceptional.
    const states = {
      intact: [reward({ itemName: "common", chance: 76 }), reward({ itemName: "rare", chance: 2 })],
      exceptional: [
        reward({ itemName: "common", chance: 70 }),
        reward({ itemName: "rare", chance: 8 }),
      ],
      radiant: [
        reward({ itemName: "common", chance: 40 }),
        reward({ itemName: "rare", chance: 20 }),
      ],
    };
    const market = prices({ common: 10, rare: 30 });

    expect(bestRefinementByTrace(states, market)).toBe("exceptional");
  });

  it("answers nothing when every trade is a loss", () => {
    const states = {
      intact: [reward({ itemName: "common", chance: 76 })],
      radiant: [reward({ itemName: "common", chance: 40 })],
    };

    expect(bestRefinementByTrace(states, prices({ common: 10 }))).toBeNull();
  });
});
