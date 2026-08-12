import type { PriceMap, Relic, RelicPriceMap, SetCategory } from "../api/types";
import { expectedValue } from "./rows";
import { setOf } from "./sets";

/**
 * One component of a Prime set, with both ways of getting it priced.
 *
 * The two routes are quoted side by side rather than reduced to one number,
 * because they are paid in different currencies: buying costs platinum for a
 * certainty, farming costs runs for a chance. Only the reader knows the
 * exchange rate between an evening and a hundred platinum.
 */
export interface SetPart {
  itemName: string;
  owned: boolean;
  /** What the finished part sells for. Null when nobody is selling it. */
  price: number | null;
  /** The relic with the best odds, at the refinement being asked about. */
  bestRelic: string | null;
  /** Those odds, as a percentage. */
  bestChance: number;
  /**
   * Runs expected before the part drops, solo.
   *
   * The mean of a geometric distribution, 1/p — not a promise. Half the time it
   * lands sooner and a long tail says it can take three times as many.
   */
  runs: number | null;
  /**
   * What the farming route actually costs in platinum, net.
   *
   * Buying the relics for those runs is not the cost of the part, because the
   * same runs hand back everything else the relic holds. The other drops are
   * subtracted:
   *
   *     runs × relicPrice − (runs × expectedValue − price)
   *
   * Without that subtraction the answer was "buy" for 578 parts out of 596 — a
   * verdict that says the same thing about everything, which is another way of
   * saying nothing. With it the split is roughly two to one, because a relic
   * that is worth more than it costs pays for its own farming, and 283 of them
   * are.
   *
   * Negative means the runs turn a profit even before the part arrives. Null
   * when either price is missing.
   */
  netFarmCost: number | null;
}

export interface PrimeSet {
  setName: string;
  /**
   * What kind of gear the set is — warframe, primary, and so on.
   *
   * Read off the parts, because that is where the item database puts it: the
   * set itself is a name this application derives, and nothing upstream has a
   * record of it. Null until the price batch lands, and for the handful of
   * sets the database does not carry.
   */
  category: SetCategory | null;
  parts: SetPart[];
  ownedCount: number;
  /** Platinum to buy every part still missing. */
  missingCost: number;
  /** True when a price is missing from that total, so it understates. */
  costIncomplete: boolean;
}

/** The relic that gives an item its best odds, and what opening it is worth. */
interface BestSource {
  relicFullName: string;
  chance: number;
  /** Average platinum one run of that relic returns, across all six drops. */
  expected: number;
}

/**
 * Every Prime set in the catalogue, with what is missing from each.
 *
 * Membership comes from Intact rows only — the four refinements share an item
 * list, so counting all of them would claim four of every part — while the odds
 * come from the refinement being asked about.
 */
export function buildSets(
  relics: Relic[],
  owned: Set<string>,
  prices: PriceMap | undefined,
  relicPrices: RelicPriceMap | undefined,
  refinement: string,
): PrimeSet[] {
  const bySet = new Map<string, Set<string>>();

  // One pass for the best source of every item, rather than a scan of the
  // catalogue per part: 596 parts against 3,085 rows is a million comparisons
  // repeated on every checkbox.
  const best = new Map<string, BestSource>();

  for (const relic of relics) {
    if (relic.refinement === "intact") {
      for (const reward of relic.rewards) {
        // The server's item database knows what a name like "Forma Blueprint"
        // actually is; the local rule is the fallback until the batch lands.
        const setName = prices?.get(reward.itemName)?.setName ?? setOf(reward.itemName);
        if (!setName) continue;

        const parts = bySet.get(setName) ?? new Set<string>();
        parts.add(reward.itemName);
        bySet.set(setName, parts);
      }
    }

    if (relic.refinement !== refinement) continue;

    const expected = expectedValue(relic.rewards, prices);

    for (const reward of relic.rewards) {
      const current = best.get(reward.itemName);
      if (!current || reward.chance > current.chance) {
        best.set(reward.itemName, {
          relicFullName: relic.fullName,
          chance: reward.chance,
          expected,
        });
      }
    }
  }

  const sets: PrimeSet[] = [];

  for (const [setName, names] of bySet) {
    const parts: SetPart[] = [...names]
      .sort((a, b) => a.localeCompare(b))
      .map((itemName) => {
        const source = best.get(itemName) ?? null;
        const price = prices?.get(itemName)?.averagePrice ?? null;
        const runs = source && source.chance > 0 ? 100 / source.chance : null;
        const relicPrice = source ? (relicPrices?.get(source.relicFullName) ?? null) : null;

        const netFarmCost =
          runs !== null && relicPrice !== null && price !== null && source !== null
            ? runs * (relicPrice - source.expected) + price
            : null;

        return {
          itemName,
          owned: owned.has(itemName),
          price,
          bestRelic: source?.relicFullName ?? null,
          bestChance: source?.chance ?? 0,
          runs,
          netFarmCost,
        };
      });

    const missing = parts.filter((part) => !part.owned);

    sets.push({
      setName,
      // Any part answers for the whole set: a Braton Prime Receiver and a
      // Braton Prime Stock are both primary. The first one that knows wins,
      // since the rest of the batch may not have arrived.
      category: parts.map((part) => prices?.get(part.itemName)?.category).find(Boolean) ?? null,
      parts,
      ownedCount: parts.length - missing.length,
      missingCost: missing.reduce((sum, part) => sum + (part.price ?? 0), 0),
      // A missing price is not a free part. Saying so keeps a total that reads
      // low from being mistaken for a bargain.
      costIncomplete: missing.some((part) => part.price === null),
    });
  }

  return sets.sort((a, b) => a.setName.localeCompare(b.setName));
}

/**
 * Which route is cheaper for a part, in the only terms both share.
 *
 * Undecidable rather than "buy" when a price is missing — an unlisted part is
 * not a cheap one, and this is exactly where a confident wrong answer costs
 * somebody an evening.
 */
export function verdictFor(part: SetPart): "buy" | "farm" | "unknown" {
  if (part.price === null || part.netFarmCost === null) return "unknown";
  return part.price <= part.netFarmCost ? "buy" : "farm";
}
