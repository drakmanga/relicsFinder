import type { Rarity, Refinement, Relic, RelicItemRow, Tier } from "../api/types";

export interface Filters {
  tiers: Set<Tier>;
  rarities: Set<Rarity>;
  refinements: Set<Refinement>;
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
  refinements: new Set(["intact"]),
  maxPrice: null,
  term: "",
});

/** An empty set means "no restriction", which reads better than pre-selecting everything. */
const allows = <T>(selected: Set<T>, value: T) => selected.size === 0 || selected.has(value);

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
    if (!allows(filters.refinements, relic.refinement)) continue;

    const relicMatches = !term || relic.fullName.toLowerCase().includes(term);

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

export type SortColumn = "chance" | "price";
export type SortDirection = "asc" | "desc";

/**
 * Sorts rows, with prices supplied separately because they load after the rows
 * do. A row with no price sorts last in either direction — an unlisted item is
 * not "cheap".
 */
export function sortRows(
  rows: RelicItemRow[],
  column: SortColumn,
  direction: SortDirection,
  prices?: Map<string, number | null>,
): RelicItemRow[] {
  const sign = direction === "asc" ? 1 : -1;

  const valueOf = (row: RelicItemRow) =>
    column === "chance" ? row.chance : (prices?.get(row.itemName) ?? null);

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
  prices: Map<string, number | null> | undefined,
): RelicItemRow[] {
  if (maxPrice === null || !prices) return rows;

  return rows.filter((row) => {
    const price = prices.get(row.itemName);
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
