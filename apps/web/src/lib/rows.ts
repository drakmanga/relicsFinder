import type { PriceMap, Rarity, Refinement, Relic, RelicItemRow, Tier } from "../api/types";

export interface Filters {
  tiers: Set<Tier>;
  rarities: Set<Rarity>;
  /**
   * One state, not a set. A relic is in one refinement at a time, and showing
   * all four would repeat every row four times with different chances.
   */
  refinement: Refinement;
  /** Platinum ceiling. `null` means no ceiling. */
  maxPrice: number | null;
  term: string;
}

export const ALL_TIERS: Tier[] = ["lith", "meso", "neo", "axi", "requiem"];
export const ALL_RARITIES: Rarity[] = ["common", "uncommon", "rare"];
export const ALL_REFINEMENTS: Refinement[] = ["intact", "exceptional", "flawless", "radiant"];

export const emptyFilters = (): Filters => ({
  tiers: new Set(),
  rarities: new Set(),
  refinement: "intact",
  maxPrice: null,
  term: "",
});

/** An empty set means "no restriction", which reads better than pre-selecting everything. */
const allows = <T>(selected: Set<T>, value: T) => selected.size === 0 || selected.has(value);

/**
 * Matches a relic name without letting a code run into a longer one.
 *
 * Typing "Axi A1" has to mean Axi A1, not the sixty-six rows of Axi A1, A10,
 * A11 … A19. A plain substring test cannot tell those apart, so when the term
 * ends on a digit — a complete relic code — a digit right after the match
 * disqualifies it.
 *
 * The check is limited to that case on purpose. "axi a" ends mid-code and is
 * plainly someone still typing, so it has to keep matching everything; an
 * earlier version applied the rule unconditionally and turned every Axi search
 * into no results at all.
 */
export function matchesRelic(fullName: string, term: string): boolean {
  const name = fullName.toLowerCase();
  if (!/[0-9]$/.test(term)) return name.includes(term);

  for (let at = name.indexOf(term); at !== -1; at = name.indexOf(term, at + 1)) {
    if (!/[0-9]/.test(name.charAt(at + term.length))) return true;
  }
  return false;
}

/**
 * Flattens relics into one row per drop and applies every filter except price.
 *
 * Price is deliberately left out: it arrives asynchronously and only for the
 * rows already on screen, so filtering on it here would need prices for all
 * 4000 rows before showing any of them.
 */
export function buildRows(relics: Relic[], filters: Filters): RelicItemRow[] {
  const term = filters.term.trim().toLowerCase();
  const rows: RelicItemRow[] = [];

  for (const relic of relics) {
    if (!allows(filters.tiers, relic.tier)) continue;
    if (relic.refinement !== filters.refinement) continue;

    const relicMatches = !term || matchesRelic(relic.fullName, term);

    for (const reward of relic.rewards) {
      if (!allows(filters.rarities, reward.rarity)) continue;
      if (term && !relicMatches && !reward.itemName.toLowerCase().includes(term)) continue;

      rows.push({
        id: `${relic.fullName}|${relic.refinement}|${reward.itemName}`,
        tier: relic.tier,
        relicFullName: relic.fullName,
        refinement: relic.refinement,
        itemName: reward.itemName,
        rarity: reward.rarity,
        chance: reward.chance,
      });
    }
  }

  return rows;
}

export type SortColumn = "relic" | "chance" | "price";
export type SortDirection = "asc" | "desc";

/**
 * Sorts rows, with prices supplied separately because they load after the rows
 * do. A row with no price sorts last in either direction — an unlisted item is
 * not "cheap".
 *
 * Sorting by relic is the default and is a different shape from the other two:
 * it groups rather than ranks. Every drop of a relic ends up together, best
 * chance first, so the table reads as a list of relics and what is inside them.
 * Ranking by drop chance instead interleaves all the relics — every Common in
 * the game, then every Uncommon — and a relic is then never seen whole.
 */
export function sortRows(
  rows: RelicItemRow[],
  column: SortColumn,
  direction: SortDirection,
  prices?: PriceMap,
): RelicItemRow[] {
  const sign = direction === "asc" ? 1 : -1;

  if (column === "relic") {
    return [...rows].sort(
      (a, b) =>
        a.relicFullName.localeCompare(b.relicFullName, "en", { numeric: true }) * sign ||
        b.chance - a.chance,
    );
  }

  const valueOf = (row: RelicItemRow) =>
    column === "chance" ? row.chance : (prices?.get(row.itemName)?.averagePrice ?? null);

  return [...rows].sort((a, b) => {
    const av = valueOf(a);
    const bv = valueOf(b);

    if (av === null && bv === null) return 0;
    if (av === null) return 1;
    if (bv === null) return -1;

    return (av - bv) * sign;
  });
}

/** Applies the price ceiling once prices are known. */
export function applyPriceCeiling(
  rows: RelicItemRow[],
  maxPrice: number | null,
  prices: PriceMap | undefined,
): RelicItemRow[] {
  if (maxPrice === null || !prices) return rows;

  return rows.filter((row) => {
    const price = prices.get(row.itemName)?.averagePrice;
    // Unpriced rows survive the ceiling: hiding them would silently drop every
    // item warframe.market does not list, Forma included.
    return price === null || price === undefined || price <= maxPrice;
  });
}

export const REFINEMENT_LABEL: Record<Refinement, string> = {
  intact: "Intact",
  exceptional: "Exceptional",
  flawless: "Flawless",
  radiant: "Radiant",
};
