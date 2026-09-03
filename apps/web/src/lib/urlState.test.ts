import { describe, expect, it } from "vitest";

import { emptyFilters } from "./rows";
import { fromSearch, toSearch } from "./urlState";
import type { UrlState } from "./urlState";

const state = (overrides: Partial<UrlState> = {}): UrlState => ({
  view: "relics",
  filters: emptyFilters(),
  selected: null,
  pickedItem: null,
  tierVault: "all",
  tierSort: null,
  setCategories: new Set(),
  setStatus: "all",
  setPhases: new Set(),
  sort: null,
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
    const search = toSearch(
      state({
        view: "tiers",
        tierVault: "farmable",
        tierSort: { column: "radshare", direction: "desc" },
      }),
    );

    expect(search).toContain("tvault=farmable");
    // The column and the direction in one key: a link carrying one without the
    // other describes a state no click can produce.
    expect(search).toContain("tsort=radshare%3Adesc");
    // The catalogue views' own vault key is a different question, and setting
    // one must never write the other. Anchored, because `tvault=farmable`
    // contains `vault=farmable` and a plain substring check would pass on a
    // writer that wrote both.
    expect(search).not.toMatch(/(^|[?&])vault=/);
  });
});

describe("the sorts in the address bar", () => {
  it("writes nothing for a table nobody has sorted", () => {
    expect(toSearch(state({ view: "tiers" }))).toBe("?view=tiers");
    expect(toSearch(state())).toBe("");
  });

  it("reads a link written before the direction existed", () => {
    // `tsort=solo` meant "solo, descending" when the column was the only half
    // that was written down, and it still does. A link that old is somebody's
    // bookmark.
    expect(fromSearch("?view=tiers&tsort=solo", emptyFilters()).tierSort).toEqual({
      column: "solo",
      direction: "desc",
    });
    expect(fromSearch("?view=tiers&tsort=relic", emptyFilters()).tierSort).toEqual({
      column: "relic",
      direction: "asc",
    });
  });

  it("refuses a column neither table has", () => {
    expect(fromSearch("?view=tiers&tsort=ducats:desc", emptyFilters()).tierSort).toBeNull();
    expect(fromSearch("?sort=trend:desc", emptyFilters()).sort).toBeNull();
  });

  it("falls back to the column's own opening direction rather than dropping it", () => {
    // A hand-edited direction is not a reason to throw the column away: the
    // reader asked for that column, and the direction has an obvious default.
    expect(fromSearch("?sort=expected:sideways", emptyFilters()).sort).toEqual({
      column: "expected",
      direction: "desc",
    });
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
    const read = fromSearch("?view=tiers&tvault=vaulted&tsort=price:asc", emptyFilters());

    expect(read.view).toBe("tiers");
    expect(read.tierVault).toBe("vaulted");
    expect(read.tierSort).toEqual({ column: "price", direction: "asc" });
    // Untouched: the two vault keys are separate questions.
    expect(read.filters.vault).toBe("all");
  });

  it("drops a tier-list population or ranking its own controls could never reach", () => {
    const read = fromSearch("?view=tiers&tvault=unvaulted&tsort=ducats", emptyFilters());

    expect(read.tierVault).toBe("all");
    // Null rather than a column: a ranking nobody asked for is the table's own
    // order, which is what the tab opens on anyway.
    expect(read.tierSort).toBeNull();
  });

  it("falls back to the defaults when neither key is there at all", () => {
    const read = fromSearch("?view=tiers", emptyFilters());

    expect(read.tierVault).toBe("all");
    expect(read.tierSort).toBeNull();
  });
});

describe("the Sets view's own three keys", () => {
  it("says nothing about the Sets view while its three controls are at rest", () => {
    expect(toSearch(state({ view: "sets" }))).toBe("?view=sets");
  });

  it("names the kinds, the progress and the phases once they are not the default", () => {
    const search = toSearch(
      state({
        view: "sets",
        setCategories: new Set(["warframe", "melee"]),
        setStatus: "missing",
        setPhases: new Set(["recently-vaulted", "long-vaulted"]),
      }),
    );

    expect(search).toContain("kind=warframe%2Cmelee");
    expect(search).toContain("prog=missing");
    expect(search).toContain("phase=recently-vaulted%2Clong-vaulted");
  });

  it("reads the three keys back", () => {
    const read = fromSearch(
      "?view=sets&kind=warframe&prog=complete&phase=dropping",
      emptyFilters(),
    );

    expect([...read.setCategories]).toEqual(["warframe"]);
    expect(read.setStatus).toBe("complete");
    expect([...read.setPhases]).toEqual(["dropping"]);
  });

  it("drops a kind, a progress or a phase its own chips could never reach", () => {
    const read = fromSearch(
      "?view=sets&kind=warframe,zaw&prog=halfway&phase=dropping,vaulted",
      emptyFilters(),
    );

    // The known half of each key survives: an outdated link narrowed to two
    // kinds must not lose the kind that is still real along with the one the
    // catalogue dropped.
    expect([...read.setCategories]).toEqual(["warframe"]);
    expect(read.setStatus).toBe("all");
    expect([...read.setPhases]).toEqual(["dropping"]);
  });

  it("keeps a relics filter and a Sets filter at once, neither standing for the other", () => {
    const read = fromSearch("?view=sets&vault=farmable&kind=melee&prog=missing", emptyFilters());

    expect(read.filters.vault).toBe("farmable");
    expect([...read.setCategories]).toEqual(["melee"]);
    expect(read.setStatus).toBe("missing");
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
    // The Sets view, with all three of its own controls off their defaults.
    state({
      view: "sets",
      setCategories: new Set(["warframe", "pet"]),
      setStatus: "missing",
      setPhases: new Set(["dropping", "unknown"]),
    }),
    // The seventh view, with both of its own controls off their defaults and
    // the catalogue's vault filter left alone beside them.
    state({
      view: "tiers",
      tierVault: "farmable",
      tierSort: { column: "price", direction: "asc" },
    }),
    // The Relics table's own order, which the address bar carried nothing of
    // until the header grew a third state.
    state({ sort: { column: "expected", direction: "asc" } }),
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
      expect(read.tierSort).toEqual(original.tierSort);
      expect([...read.setCategories].sort()).toEqual([...original.setCategories].sort());
      expect(read.setStatus).toBe(original.setStatus);
      expect([...read.setPhases].sort()).toEqual([...original.setPhases].sort());
      expect(read.sort).toEqual(original.sort);
    },
  );
});
