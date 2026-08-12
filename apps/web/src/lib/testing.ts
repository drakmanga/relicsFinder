import type { ItemPrice, PriceMap, Refinement, Relic, Reward, Tier } from "../api/types";

/**
 * Builders for the tests.
 *
 * A relic is eight fields and a reward is four, and a test that spells all of
 * them out says nothing about which one it is testing. These default everything
 * and let a test name only what it cares about, so `relic({ tier: "axi" })`
 * reads as "an Axi relic" rather than as a wall of scaffolding.
 *
 * Kept beside the code rather than under a fixtures directory: they encode the
 * same shapes, and they should move when those move.
 */
export function reward(overrides: Partial<Reward> = {}): Reward {
  return {
    id: overrides.itemName ?? "reward",
    itemName: "Volt Prime Neuroptics Blueprint",
    rarity: "common",
    chance: 25.33,
    ...overrides,
  };
}

export function relic(overrides: Partial<Relic> = {}): Relic {
  const tier: Tier = overrides.tier ?? "lith";
  const relicName = overrides.relicName ?? "V9";

  return {
    tier,
    relicName,
    fullName: overrides.fullName ?? `${tier.charAt(0).toUpperCase()}${tier.slice(1)} ${relicName}`,
    refinement: "intact",
    rewards: [reward()],
    ...overrides,
  };
}

/** The six rewards every relic in the game holds: three, two and one. */
export function sixRewards(names: string[]): Reward[] {
  const rarities: Reward["rarity"][] = [
    "common",
    "common",
    "common",
    "uncommon",
    "uncommon",
    "rare",
  ];
  const chances = [25.33, 25.33, 25.33, 11, 11, 2];

  return names
    .slice(0, 6)
    .map((itemName, index) =>
      reward({ itemName, rarity: rarities[index], chance: chances[index] }),
    );
}

/** A price map from a plain object, so a test can write `{ "Volt Prime": 30 }`. */
export function prices(entries: Record<string, number | null>): PriceMap {
  const map = new Map<string, ItemPrice>();

  for (const [itemName, averagePrice] of Object.entries(entries)) {
    map.set(itemName, {
      itemName,
      averagePrice,
      median: averagePrice,
      volume: 10,
      trend: null,
      slug: itemName.toLowerCase().replace(/\s+/g, "_"),
      ducats: null,
      setName: null,
      category: null,
    });
  }

  return map;
}

/** The same relic in every refinement, with a different reward list per state. */
export function statesOf(states: Partial<Record<Refinement, Reward[]>>): Relic[] {
  return Object.entries(states).map(([refinement, rewards]) =>
    relic({ refinement: refinement as Refinement, rewards }),
  );
}
