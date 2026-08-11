import { describe, expect, it } from "vitest";

import { emptyFilters } from "./rows";
import { fromSearch, toSearch } from "./urlState";
import type { UrlState } from "./urlState";

const state = (overrides: Partial<UrlState> = {}): UrlState => ({
  view: "relics",
  filters: emptyFilters(),
  selected: null,
  pickedItem: null,
  ...overrides,
});

describe("toSearch", () => {
  it("writes nothing for a clean view, so a clean view has a clean URL", () => {
    expect(toSearch(state())).toBe("");
  });

  it("omits the default view but names every other", () => {
    expect(toSearch(state({ view: "relics" }))).toBe("");
    expect(toSearch(state({ view: "items" }))).toBe("?view=items");
  });

  it("writes only what differs from the default", () => {
    const search = toSearch(
      state({
        filters: { ...emptyFilters(), term: "volt", maxPrice: 20 },
      }),
    );

    expect(search).toContain("q=volt");
    expect(search).toContain("max=20");
    expect(search).not.toContain("ref=");
    expect(search).not.toContain("vault=");
  });

  it("trims the search term", () => {
    expect(toSearch(state({ filters: { ...emptyFilters(), term: "  volt  " } }))).toBe("?q=volt");
  });

  it("treats whitespace as no term at all", () => {
    expect(toSearch(state({ filters: { ...emptyFilters(), term: "   " } }))).toBe("");
  });

  it("keeps a ceiling of zero, which is a filter and not an absence", () => {
    expect(toSearch(state({ filters: { ...emptyFilters(), maxPrice: 0 } }))).toBe("?max=0");
  });
});

describe("fromSearch", () => {
  it("reads a link back into the state it describes", () => {
    const read = fromSearch("?view=items&q=volt&max=20&tier=lith,axi", emptyFilters());

    expect(read.view).toBe("items");
    expect(read.filters.term).toBe("volt");
    expect(read.filters.maxPrice).toBe(20);
    expect([...read.filters.tiers]).toEqual(["lith", "axi"]);
  });

  it("drops a value its own controls could never reach", () => {
    // A hand-edited or outdated URL must not put the app in a state it cannot
    // get out of.
    const read = fromSearch("?view=nonsense&tier=lith,unicorn&ref=molten", emptyFilters());

    expect(read.view).toBe("relics");
    expect([...read.filters.tiers]).toEqual(["lith"]);
    expect(read.filters.refinement).toBe("intact");
  });

  it("refuses a negative or unparseable ceiling", () => {
    expect(fromSearch("?max=-5", emptyFilters()).filters.maxPrice).toBeNull();
    expect(fromSearch("?max=lots", emptyFilters()).filters.maxPrice).toBeNull();
  });

  it("keeps a ceiling of zero", () => {
    expect(fromSearch("?max=0", emptyFilters()).filters.maxPrice).toBe(0);
  });
});

describe("a link survives the round trip", () => {
  const cases: UrlState[] = [
    state(),
    state({ view: "items", filters: { ...emptyFilters(), term: "volt", maxPrice: 20 } }),
    state({
      view: "sets",
      filters: {
        ...emptyFilters(),
        tiers: new Set(["lith", "axi"]),
        rarities: new Set(["rare"]),
        refinement: "radiant",
        vault: "farmable",
        maxPrice: 0,
      },
      selected: "Lith V9|radiant",
      pickedItem: "Volt Prime Blueprint",
    }),
  ];

  it.each(cases.map((c, index) => [index, c] as const))(
    "case %i comes back unchanged",
    (_index, original) => {
      const read = fromSearch(toSearch(original), emptyFilters());

      expect(read.view).toBe(original.view);
      expect(read.selected).toBe(original.selected);
      expect(read.pickedItem).toBe(original.pickedItem);
      expect(read.filters.term).toBe(original.filters.term.trim());
      expect(read.filters.refinement).toBe(original.filters.refinement);
      expect(read.filters.vault).toBe(original.filters.vault);
      expect(read.filters.maxPrice).toBe(original.filters.maxPrice);
      expect([...read.filters.tiers].sort()).toEqual([...original.filters.tiers].sort());
      expect([...read.filters.rarities].sort()).toEqual([...original.filters.rarities].sort());
    },
  );
});
