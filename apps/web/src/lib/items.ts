import type { Rarity, Relic, Tier } from "../api/types";
import { setOf } from "./sets";
import type { Filters } from "./rows";

export interface PrimeItemRow {
  /** The item name is the identity: one row per part, however many relics hold it. */
  itemName: string;
  setName: string | null;
  rarity: Rarity;
  /** Relics that drop it, Intact only so one relic is not counted four times. */
  relicNames: string[];
  tiers: Tier[];
}

/**
 * One row per Prime part, rather than per relic-and-part pairing.
 *
 * The relics view answers "what is in this relic"; this answers "where do I get
 * this part", which is the question when farming a specific set.
 *
 * Built from Intact rows only. Every relic exists in four refinement states
 * with the same item list, so counting all of them would claim four times as
 * many sources as there are relics.
 */
export function buildItemRows(relics: Relic[], filters: Filters): PrimeItemRow[] {
  const byItem = new Map<string, PrimeItemRow>();

  for (const relic of relics) {
    if (relic.refinement !== "intact") continue;
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
        };
        byItem.set(reward.itemName, row);
      }

      row.relicNames.push(relic.fullName);
      if (!row.tiers.includes(relic.tier)) row.tiers.push(relic.tier);
    }
  }

  const term = filters.term.trim().toLowerCase();
  const rows = [...byItem.values()];

  return term
    ? rows.filter(
        (row) =>
          row.itemName.toLowerCase().includes(term) ||
          row.relicNames.some((name) => name.toLowerCase().includes(term)),
      )
    : rows;
}
