import type { Refinement, Relic, Tier } from "../api/types";

/**
 * The Prime set an item belongs to.
 *
 * Everything up to and including the standalone word "Prime": `Volt Prime
 * Neuroptics Blueprint` → `Volt Prime`, `Dual Kamas Prime Blade` → `Dual Kamas
 * Prime`. The multi-word cases fall out of the rule rather than needing a list.
 *
 * Returns null when there is no such word — `Forma Blueprint` belongs to no set,
 * and neither do the credit and endo rewards that share the drop tables.
 */
export function setOf(itemName: string): string | null {
  const words = itemName.trim().split(/\s+/);
  const index = words.findIndex((word) => word.toLowerCase() === "prime");
  if (index === -1) return null;
  return words.slice(0, index + 1).join(" ");
}

export interface RelicSource {
  relicFullName: string;
  tier: Tier;
  refinement: Refinement;
  chance: number;
}

/**
 * Every relic that drops an item, and at what chance.
 *
 * Computed from the dataset already in memory rather than through
 * `/api/search/{item}`: the whole relic list is loaded on first paint, so a
 * request would be slower and — because the rarity correction is applied on the
 * way in — could disagree with what the table shows.
 */
export function sourcesFor(relics: Relic[], itemName: string): RelicSource[] {
  const sources: RelicSource[] = [];

  for (const relic of relics) {
    const reward = relic.rewards.find((r) => r.itemName === itemName);
    if (!reward) continue;

    sources.push({
      relicFullName: relic.fullName,
      tier: relic.tier,
      refinement: relic.refinement,
      chance: reward.chance,
    });
  }

  return sources.sort((a, b) => b.chance - a.chance);
}

/** The other parts of a set, in the order they appear in the data. */
export function partsOfSet(relics: Relic[], setName: string): string[] {
  const parts = new Set<string>();

  for (const relic of relics) {
    for (const reward of relic.rewards) {
      if (setOf(reward.itemName) === setName) parts.add(reward.itemName);
    }
  }

  return [...parts].sort();
}
