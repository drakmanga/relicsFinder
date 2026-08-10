import type {
  PriceMap,
  Rarity,
  Refinement,
  Relic,
  RelicPriceMap,
  RelicRow,
  Reward,
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

export const ALL_TIERS: Tier[] = ["lith", "meso", "neo", "axi", "requiem", "vanguard"];
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

/**
 * Where the price slider stops filtering.
 *
 * The top of the range means "no ceiling", not "500p": a handful of parts sell
 * above it, and a slider pushed to the end has to keep them rather than hide
 * the most expensive things in the game behind an off-by-one.
 */
export const MAX_PRICE_CEILING = 500;

/**
 * "Droppable", not "Farmable": the state being named is whether the relic is in
 * the drop tables at all, which is a fact about the game rather than about how
 * hard it would be to get. The `farmable` key is left alone — it is in shared
 * links as `?vault=farmable`, and renaming it would break them.
 */
export const VAULT_LABEL: Record<VaultFilter, string> = {
  all: "All",
  farmable: "Droppable",
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

    // Rarity is deliberately not consulted here. Every relic holds three
    // commons, two uncommons and one rare, so "keep the relics that contain a
    // Rare" keeps all of them — the filter belongs to Prime Items, where a row
    // is a part and carries a rarity of its own.

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

/**
 * What one run of the relic pays on average, in platinum.
 *
 * The sum of each drop's price weighted by its chance. This is the number the
 * decision to open a relic actually turns on, and it is close to unrelated to
 * the most valuable drop: across the whole catalogue the top twenty by best
 * drop and the top twenty by expected value share a single relic. A 60p rare at
 * 2% contributes 1.2p; a 20p common at 25.33% contributes 5.
 *
 * Unpriced drops count as zero, which understates rather than invents.
 */
export function expectedValue(rewards: Reward[], prices: PriceMap | undefined): number {
  if (!prices) return 0;

  return rewards.reduce(
    (sum, reward) => sum + (reward.chance / 100) * (prices.get(reward.itemName)?.averagePrice ?? 0),
    0,
  );
}

/**
 * Expected value when `players` people crack the same relic together.
 *
 * Everyone opens their own copy, all four rewards are revealed, and the squad
 * keeps one — so the payout is the best of `players` independent rolls, not the
 * average of them. That is why radshare squads exist, and it is the single
 * biggest lever on what a relic is worth: nothing else in this tool changes a
 * number by a factor of three.
 *
 * P(best is reward i) = T(i)^n − T(i+1)^n, where T(i) is the chance of landing
 * reward i or anything better once the rewards are sorted by value. Exact, and
 * six terms long.
 */
export function squadValue(
  rewards: Reward[],
  prices: PriceMap | undefined,
  players: number,
): number {
  if (!prices || players < 1) return 0;

  const sorted = rewards
    .map((reward) => ({
      value: prices.get(reward.itemName)?.averagePrice ?? 0,
      p: reward.chance / 100,
    }))
    .sort((a, b) => b.value - a.value);

  let total = 0;
  let tailAbove = 1; // chance of landing this reward or a better one

  for (const { value, p } of sorted) {
    const tailBelow = Math.max(0, tailAbove - p);
    total += value * (Math.pow(tailAbove, players) - Math.pow(tailBelow, players));
    tailAbove = tailBelow;
  }

  return total;
}

/** Chance that at least one of `players` rolls lands the reward. */
export const atLeastOnce = (chance: number, players: number) =>
  (1 - Math.pow(1 - chance / 100, players)) * 100;

/**
 * Void traces to refine an Intact relic to each state.
 *
 * Fixed by the game. Combined with the expected values above, the difference
 * between two states divided by its cost is platinum per trace — the only
 * honest way to answer "is refining this one worth it", and sometimes the
 * answer is no: a relic whose rare is cheap can be worth *less* Radiant,
 * because refining takes chance away from the commons to give it to the rare.
 */
export const TRACE_COST: Record<Refinement, number> = {
  intact: 0,
  exceptional: 25,
  flawless: 50,
  radiant: 100,
};

/*
 * There is deliberately no relic-level ducat total here.
 *
 * A relic is not a thing that dissolves — only the part that comes out of it
 * is, and a run yields exactly one. Summing the ducats of all six drops named
 * a quantity that does not exist, and it sorted relics by it. Ducats belong to
 * the part: the Prime Items view and the drop rows inside the relic panel.
 */

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

export type RelicSortColumn = "relic" | "expected" | "value" | "cost";

export function sortRelicRows(
  rows: RelicRow[],
  column: RelicSortColumn,
  direction: SortDirection,
  prices: PriceMap | undefined,
  relicPrices?: RelicPriceMap,
): RelicRow[] {
  const sign = direction === "asc" ? 1 : -1;

  if (column === "relic") {
    return [...rows].sort(
      (a, b) => a.relicFullName.localeCompare(b.relicFullName, "en", { numeric: true }) * sign,
    );
  }

  const valueOf = (row: RelicRow) => {
    if (column === "expected") return expectedValue(row.rewards, prices);
    if (column === "cost") return relicPrices?.get(row.relicFullName) ?? null;
    return bestDropValue(row, prices);
  };

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
