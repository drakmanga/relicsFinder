import { describe, expect, it } from "vitest";

import { emptyFilters } from "./rows";
import { DEFAULT_TIER_SORT } from "./tierList";
import { fromSearch, toSearch } from "./urlState";
import type { UrlState } from "./urlState";

const state = (overrides: Partial<UrlState> = {}): UrlState => ({
  view: "relics",
  filters: emptyFilters(),
  selected: null,
  pickedItem: null,
  tierVault: "all",
  tierSort: DEFAULT_TIER_SORT,
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

  it("names a refinement that is not the default, and only that one", () => {
    // Both directions, because the writer omitting `ref` and the reader
    // supplying it back are one pair: if they ever disagree about which state
    // is the default, a link shared without `ref` reopens somewhere else.
    const intact = toSearch(state({ filters: { ...emptyFilters(), refinement: "intact" } }));
    expect(intact).toBe("?ref=intact");
    expect(fromSearch(intact, emptyFilters()).filters.refinement).toBe("intact");

    const radiant = toSearch(state({ filters: { ...emptyFilters(), refinement: "radiant" } }));
    expect(radiant).not.toContain("ref=");
    expect(fromSearch(radiant, emptyFilters()).filters.refinement).toBe("radiant");
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

  it("says nothing about the tier list while its two controls are at rest", () => {
    // The whole point of the two keys being their own: a link from any other
    // view must not carry a tier-list population it never asked about.
    expect(toSearch(state({ view: "tiers" }))).toBe("?view=tiers");
  });

  it("names the tier list's population and ranking once they are not the default", () => {
    const search = toSearch(state({ view: "tiers", tierVault: "farmable", tierSort: "radshare" }));

    expect(search).toContain("tvault=farmable");
    expect(search).toContain("tsort=radshare");
    // The catalogue views' own vault key is a different question, and setting
    // one must never write the other. Anchored, because `tvault=farmable`
    // contains `vault=farmable` and a plain substring check would pass on a
    // writer that wrote both.
    expect(search).not.toMatch(/(^|[?&])vault=/);
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
    expect(read.filters.refinement).toBe("radiant");
  });

  it("refuses a negative or unparseable ceiling", () => {
    expect(fromSearch("?max=-5", emptyFilters()).filters.maxPrice).toBeNull();
    expect(fromSearch("?max=lots", emptyFilters()).filters.maxPrice).toBeNull();
  });

  it("keeps a ceiling of zero", () => {
    expect(fromSearch("?max=0", emptyFilters()).filters.maxPrice).toBe(0);
  });

  it("reads the tier list's own two keys", () => {
    const read = fromSearch("?view=tiers&tvault=vaulted&tsort=price", emptyFilters());

    expect(read.view).toBe("tiers");
    expect(read.tierVault).toBe("vaulted");
    expect(read.tierSort).toBe("price");
    // Untouched: the two vault keys are separate questions.
    expect(read.filters.vault).toBe("all");
  });

  it("drops a tier-list population or ranking its own controls could never reach", () => {
    const read = fromSearch("?view=tiers&tvault=unvaulted&tsort=ducats", emptyFilters());

    expect(read.tierVault).toBe("all");
    expect(read.tierSort).toBe(DEFAULT_TIER_SORT);
  });

  it("falls back to the defaults when neither key is there at all", () => {
    const read = fromSearch("?view=tiers", emptyFilters());

    expect(read.tierVault).toBe("all");
    expect(read.tierSort).toBe(DEFAULT_TIER_SORT);
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
        // Not the default, so this case carries an explicit `ref` through the
        // round trip rather than exercising the omission the case above covers.
        refinement: "intact",
        vault: "farmable",
        maxPrice: 0,
      },
      selected: "Lith V9|radiant",
      pickedItem: "Volt Prime Blueprint",
    }),
    // The seventh view, with both of its own controls off their defaults and
    // the catalogue's vault filter left alone beside them.
    state({ view: "tiers", tierVault: "farmable", tierSort: "price" }),
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
      expect(read.tierVault).toBe(original.tierVault);
      expect(read.tierSort).toBe(original.tierSort);
    },
  );
});
