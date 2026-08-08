import type { Rarity, Relic, Tier } from "../api/types";
import { setOf } from "./sets";
import { matchesRelic, type Filters } from "./rows";

export interface PrimeItemRow {
  /** The item name is the identity: one row per part, however many relics hold it. */
  itemName: string;
  setName: string | null;
  rarity: Rarity;
  /** Relics that drop it, in the chosen refinement only. */
  relicNames: string[];
  tiers: Tier[];
  /** Best chance across those relics, at the chosen refinement. */
  bestChance: number;
}

/**
 * One row per Prime part, rather than per relic-and-part pairing.
 *
 * The relics view answers "what is in this relic"; this answers "where do I get
 * this part", which is the question when farming a specific set.
 *
 * Exactly one refinement state is read. All four hold the same item list, so
 * reading them all would claim four times as many sources as there are relics —
 * but the *chances* differ, which is why the state is a parameter rather than
 * hardcoded to Intact: a part at 2% Intact is at 10% Radiant, and that changes
 * where it is worth farming.
 */
export function buildItemRows(relics: Relic[], filters: Filters): PrimeItemRow[] {
  const refinement = filters.refinement;
  const byItem = new Map<string, PrimeItemRow>();

  for (const relic of relics) {
    if (relic.refinement !== refinement) continue;
    if (filters.tiers.size > 0 && !filters.tiers.has(relic.tier)) continue;

    for (const reward of relic.rewards) {
      if (filters.rarities.size > 0 && !filters.rarities.has(reward.rarity)) continue;

      let row = byItem.get(reward.itemName);
      if (!row) {
        row = {
          itemName: reward.itemName,
          setName: setOf(reward.itemName),
          rarity: reward.rarity,
          relicNames: [],
          tiers: [],
          bestChance: 0,
        };
        byItem.set(reward.itemName, row);
      }

      row.relicNames.push(relic.fullName);
      if (!row.tiers.includes(relic.tier)) row.tiers.push(relic.tier);
      if (reward.chance > row.bestChance) row.bestChance = reward.chance;
    }
  }

  const term = filters.term.trim().toLowerCase();
  const rows = [...byItem.values()];

  return term
    ? rows.filter(
        (row) =>
          row.itemName.toLowerCase().includes(term) ||
          row.relicNames.some((name) => matchesRelic(name, term)),
      )
    : rows;
}
