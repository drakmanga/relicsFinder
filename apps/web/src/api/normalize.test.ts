import { describe, expect, it } from "vitest";

import { normalizeTierList } from "./normalize";
import type { WireTierList, WireTierListRow } from "./types";

/**
 * The one place the ranking changes shape on the way in.
 *
 * The arithmetic behind every number here runs on the backend and is tested
 * there. What is tested here is the translation: an era spelled the catalogue's
 * way, and a trend the wire deliberately keeps in two fields so that a
 * percentage of null cannot be mistaken for a market nobody measured.
 */
const wireRow = (overrides: Partial<WireTierListRow> = {}): WireTierListRow => ({
  relic: "Lith V9",
  era: "Lith",
  soloValue: 5,
  radshareValue: 15,
  soloBand: "C",
  radshareBand: "B",
  relicPrice: null,
  trend: "no-baseline",
  trendPercent: null,
  ...overrides,
});

const wire = (rows: WireTierListRow[], prices?: WireTierList["prices"]): WireTierList => ({
  version: 1,
  vault: "all",
  sort: "relic",
  direction: "asc",
  players: 4,
  population: rows.length,
  soloMedian: 5,
  radshareMedian: 15,
  asOf: "2026-09-12T10:00:00Z",
  nextUpdateAt: "2026-09-12T11:00:00Z",
  prices: prices ?? { parts: 100, partsPriced: 100, relics: 100, relicsPriced: 100 },
  rows,
});

describe("the ranking, on the way in", () => {
  it("reads the era the catalogue's way and answers in the design system's", () => {
    // "Lith" on the wire, `lith` in the unions the chip narrows against — the
    // same translation `normalizeRelic` makes for the same reason.
    expect(normalizeTierList(wire([wireRow({ era: "Axi" })])).rows[0]?.tier).toBe("axi");
  });

  it("falls back rather than inventing an era it does not know", () => {
    expect(normalizeTierList(wire([wireRow({ era: "Omega" })])).rows[0]?.tier).toBe("lith");
  });

  it("folds a measured movement back into one number", () => {
    const row = normalizeTierList(wire([wireRow({ trend: "moved", trendPercent: -41.51 })]))
      .rows[0];

    expect(row?.trend).toBe(-41.51);
  });

  it("keeps a relic that held still apart from one nobody measured", () => {
    const steady = normalizeTierList(wire([wireRow({ trend: "steady" })])).rows[0];
    const unmeasured = normalizeTierList(wire([wireRow({ trend: "no-baseline" })])).rows[0];

    expect(steady?.trend).toBe("steady");
    expect(unmeasured?.trend).toBe("no-baseline");
  });

  it("refuses a movement with no number behind it", () => {
    // Defensive rather than expected: the backend sends a percentage with every
    // `moved`. A row that said it moved and did not say how far would otherwise
    // become the number zero, which is a claim about the market.
    const row = normalizeTierList(wire([wireRow({ trend: "moved", trendPercent: null })])).rows[0];

    expect(row?.trend).toBe("no-baseline");
  });

  it("carries the letters, the price and both medians through untouched", () => {
    const list = normalizeTierList(wire([wireRow({ soloBand: null, relicPrice: 12.5 })]));

    expect(list.rows[0]?.soloLetter).toBeNull();
    expect(list.rows[0]?.radshareLetter).toBe("B");
    expect(list.rows[0]?.relicPrice).toBe(12.5);
    expect(list.soloMedian).toBe(5);
    expect(list.radshareMedian).toBe(15);
  });

  it("carries the coverage counts as counts", () => {
    // Whether a batch that size still counts as filling is a rule the app owns
    // once, in lib/priceProgress; this layer must not decide it a second time.
    const counts = { parts: 596, partsPriced: 166, relics: 772, relicsPriced: 59 };

    expect(normalizeTierList(wire([wireRow()], counts)).prices).toEqual(counts);
  });
});
