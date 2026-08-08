import type {
  PriceMap,
  Rarity,
  Refinement,
  Relic,
  RelicRow,
  Tier,
} from "../api/types";

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
  /**
   * Whether the relic can still be farmed.
   *
   * Not a set like the others: the three options are exhaustive and mutually
   * exclusive, so a set could hold the meaningless "neither".
   */
  vault: VaultFilter;
  term: string;
}

export type VaultFilter = "all" | "farmable" | "vaulted";

export const ALL_TIERS: Tier[] = ["lith", "meso", "neo", "axi", "requiem"];
export const ALL_RARITIES: Rarity[] = ["common", "uncommon", "rare"];
export const ALL_REFINEMENTS: Refinement[] = ["intact", "exceptional", "flawless", "radiant"];

export const emptyFilters = (): Filters => ({
  tiers: new Set(),
  rarities: new Set(),
  refinement: "intact",
  maxPrice: null,
  vault: "all",
  term: "",
});

export const ALL_VAULT_FILTERS: VaultFilter[] = ["all", "farmable", "vaulted"];

export const VAULT_LABEL: Record<VaultFilter, string> = {
  all: "All",
  farmable: "Farmable",
  vaulted: "Vaulted",
};

/**
 * Keeps relics by whether they are still dropping.
 *
 * Applied here rather than in `buildRelicRows` because the rotation arrives in
 * its own request: rows must exist before it lands, or the table would be empty
 * for as long as that request takes. Until it does, the filter passes
 * everything — the honest answer to "which are farmable" is not yet known.
 */
export function applyVaultFilter(
  rows: RelicRow[],
  vault: VaultFilter,
  unvaulted: Set<string> | undefined,
): RelicRow[] {
  if (vault === "all" || !unvaulted) return rows;

  return rows.filter((row) => unvaulted.has(row.relicFullName) === (vault === "farmable"));
}

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
 * One row per relic, with everything it drops attached.
 *
 * Filters that describe a drop — rarity, and a search term that names a part —
 * keep a relic when *any* of its drops matches, because the question they ask
 * is "which relics hold one of these". The rewards are not trimmed to the
 * matches: a relic that holds a Rare you want also holds five things you get
 * instead, and hiding them would misrepresent what opening it does.
 */
export function buildRelicRows(relics: Relic[], filters: Filters): RelicRow[] {
  const term = filters.term.trim().toLowerCase();
  const rows: RelicRow[] = [];

  for (const relic of relics) {
    if (!allows(filters.tiers, relic.tier)) continue;
    if (relic.refinement !== filters.refinement) continue;

    if (filters.rarities.size > 0 && !relic.rewards.some((r) => filters.rarities.has(r.rarity))) {
      continue;
    }

    if (
      term &&
      !matchesRelic(relic.fullName, term) &&
      !relic.rewards.some((r) => r.itemName.toLowerCase().includes(term))
    ) {
      continue;
    }

    rows.push({
      id: `${relic.fullName}|${relic.refinement}`,
      tier: relic.tier,
      relicFullName: relic.fullName,
      refinement: relic.refinement,
      rewards: relic.rewards,
    });
  }

  return rows;
}

/**
 * The most valuable thing in the relic, in platinum.
 *
 * This is what decides whether a relic is worth opening: the other five drops
 * are what you get when you miss. Null while prices are still loading, and null
 * for a relic whose drops are all unlisted — Forma-only relics exist.
 */
export function bestDropValue(row: RelicRow, prices: PriceMap | undefined): number | null {
  if (!prices) return null;

  let best: number | null = null;
  for (const reward of row.rewards) {
    const price = prices.get(reward.itemName)?.averagePrice;
    if (price != null && (best === null || price > best)) best = price;
  }
  return best;
}

/** Ducats for the whole relic, if every drop were dissolved. */
export function ducatTotal(row: RelicRow, prices: PriceMap | undefined): number {
  if (!prices) return 0;
  return row.rewards.reduce((sum, reward) => sum + (prices.get(reward.itemName)?.ducats ?? 0), 0);
}

/**
 * Applies the price ceiling to the number the table actually shows.
 *
 * On a relic list the ceiling can only mean one thing without inventing a
 * meaning of its own: the best drop is the column, so the best drop is what it
 * caps. Relics with nothing listed survive — the ceiling is not a judgement
 * about them, it is a lack of data.
 */
export function applyRelicPriceCeiling(
  rows: RelicRow[],
  maxPrice: number | null,
  prices: PriceMap | undefined,
): RelicRow[] {
  if (maxPrice === null || !prices) return rows;

  return rows.filter((row) => {
    const best = bestDropValue(row, prices);
    return best === null || best <= maxPrice;
  });
}

export type RelicSortColumn = "relic" | "value" | "ducats";

export function sortRelicRows(
  rows: RelicRow[],
  column: RelicSortColumn,
  direction: SortDirection,
  prices: PriceMap | undefined,
): RelicRow[] {
  const sign = direction === "asc" ? 1 : -1;

  if (column === "relic") {
    return [...rows].sort(
      (a, b) => a.relicFullName.localeCompare(b.relicFullName, "en", { numeric: true }) * sign,
    );
  }

  const valueOf = (row: RelicRow) =>
    column === "value" ? bestDropValue(row, prices) : ducatTotal(row, prices);

  return [...rows].sort((a, b) => {
    const av = valueOf(a);
    const bv = valueOf(b);

    // A relic with nothing listed is not the cheapest relic; it is unknown, and
    // it sorts last whichever way the column points.
    if (av === null && bv === null) return 0;
    if (av === null) return 1;
    if (bv === null) return -1;

    return (av - bv) * sign;
  });
}

export type SortDirection = "asc" | "desc";

export const REFINEMENT_LABEL: Record<Refinement, string> = {
  intact: "Intact",
  exceptional: "Exceptional",
  flawless: "Flawless",
  radiant: "Radiant",
};
