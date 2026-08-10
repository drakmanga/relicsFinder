import type { PriceMap, Rarity, Relic, RelicItemRow, Tier } from "../api/types";
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
const startsWithQuantity = (itemName: string) => /^\d/.test(itemName);

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

  // Alphabetical, because this view is a catalogue and nothing here ranks the
  // parts against each other. Insertion order was the order relics happened to
  // be read in, which is no order at all to someone looking for one part.
  //
  // The quantity-prefixed rewards — "2X Forma Blueprint", "1200X Kuva" — sort
  // to the end rather than ahead of the A's. They are the only rewards that are
  // not Prime parts, and this is a list of Prime parts.
  const rows = [...byItem.values()].sort(
    (a, b) =>
      Number(startsWithQuantity(a.itemName)) - Number(startsWithQuantity(b.itemName)) ||
      a.itemName.localeCompare(b.itemName, "en", { numeric: true }),
  );

  return term
    ? rows.filter(
        (row) =>
          row.itemName.toLowerCase().includes(term) ||
          row.relicNames.some((name) => matchesRelic(name, term)),
      )
    : rows;
}

/**
 * Applies the price ceiling to a list of parts.
 *
 * Here the ceiling means what it says: a row is one part, so it is that part's
 * own price being capped — no need for the relic list's convention of capping
 * the best drop. The ceiling was previously never applied to this view at all,
 * so the slider moved, the readout changed and the table did not.
 *
 * Prices arrive in their own request, so this runs separately from
 * `buildItemRows`: rows have to exist before the batch lands, or the view would
 * be empty for as long as it takes. Unpriced parts survive the filter — nothing
 * is known about them, which is not the same as them being expensive.
 */
export function applyItemPriceCeiling(
  rows: PrimeItemRow[],
  maxPrice: number | null,
  prices: PriceMap | undefined,
): PrimeItemRow[] {
  if (maxPrice === null || !prices) return rows;

  return rows.filter((row) => {
    const price = prices.get(row.itemName)?.averagePrice;
    return price == null || price <= maxPrice;
  });
}

/**
 * A panel row for a part, built from the first relic that drops it.
 *
 * The Prime Items panel has no table row behind it — a row there is a part, and
 * the panel wants a relic to have come from — so one is synthesised. Intact
 * only: all four states hold the same items, and the panel quotes the state the
 * catalogue is read at.
 *
 * A plain function rather than a `useMemo` body: the loop with its early
 * returns is exactly the shape React Compiler refuses to memoise, so writing it
 * inline opted the whole component out of compilation.
 */
export function synthesiseItemRow(relics: Relic[], itemName: string | null): RelicItemRow | null {
  if (!itemName) return null;

  for (const relic of relics) {
    if (relic.refinement !== "intact") continue;

    const reward = relic.rewards.find((r) => r.itemName === itemName);
    if (!reward) continue;

    return {
      id: `${relic.fullName}|${relic.refinement}|${itemName}`,
      tier: relic.tier,
      relicFullName: relic.fullName,
      refinement: relic.refinement,
      itemName,
      rarity: reward.rarity,
      chance: reward.chance,
    };
  }

  return null;
}
