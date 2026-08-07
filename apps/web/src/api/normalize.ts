import type {
  DropInfo,
  Rarity,
  Refinement,
  Relic,
  RelicGroup,
  Reward,
  Tier,
  WireDropInfo,
  WireRelic,
  WireRewards,
} from "./types";

const TIERS: Tier[] = ["lith", "meso", "neo", "axi", "requiem"];
const REFINEMENTS: Refinement[] = ["intact", "exceptional", "flawless", "radiant"];
const RARITIES: Rarity[] = ["common", "uncommon", "rare"];

function pick<T extends string>(value: string | undefined, allowed: T[], fallback: T): T {
  const key = (value ?? "").trim().toLowerCase();
  return (allowed as string[]).includes(key) ? (key as T) : fallback;
}

/**
 * `chance` arrives as a String. Warframe's tables write it as a bare number
 * ("25.33"), but a percent sign or a comma decimal separator would both parse
 * to NaN, so both are stripped first. An unparseable value becomes 0 rather
 * than NaN — NaN would silently poison every sort and total downstream.
 */
export function parseChance(raw: string | number | null | undefined): number {
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : 0;
  if (!raw) return 0;
  const cleaned = raw.replace("%", "").replace(",", ".").trim();
  const n = Number.parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Drop chance to rarity, per refinement state.
 *
 * The source labels rarity wrongly and always has: every 25.33% drop is tagged
 * "Uncommon" when it is Common, and the string "Common" appears nowhere in the
 * dataset — 2067 Uncommon@25.33, 1378 Uncommon@11, 689 Rare@2 across the Intact
 * relics alone. Filtering by Common would therefore match nothing.
 *
 * The chances themselves are correct and fixed by the game, so they are the
 * reliable signal. Note that ranking by chance would not work: at Radiant the
 * three Commons sit at 16.67% while the two Uncommons are at 20%, so the order
 * inverts. The table has to be explicit.
 */
const RARITY_BY_CHANCE: Record<Refinement, Array<[number, Rarity]>> = {
  intact: [
    [25.33, "common"],
    [11, "uncommon"],
    [2, "rare"],
  ],
  exceptional: [
    [23.33, "common"],
    [13, "uncommon"],
    [4, "rare"],
  ],
  flawless: [
    [20, "common"],
    [17, "uncommon"],
    [6, "rare"],
  ],
  radiant: [
    [16.67, "common"],
    [20, "uncommon"],
    [10, "rare"],
  ],
};

/** Chances are published to two decimals, so this only absorbs float noise. */
const CHANCE_TOLERANCE = 0.05;

function rarityFor(chance: number, refinement: Refinement, declared: string): Rarity {
  for (const [value, rarity] of RARITY_BY_CHANCE[refinement]) {
    if (Math.abs(chance - value) < CHANCE_TOLERANCE) return rarity;
  }
  // An unrecognised chance means the game changed the tables; the declared
  // label is then a better guess than a hardcoded default.
  return pick(declared, RARITIES, "common");
}

export function normalizeReward(wire: WireRewards, refinement: Refinement): Reward {
  const chance = parseChance(wire.chance);

  return {
    id: wire._id,
    itemName: wire.itemName,
    rarity: rarityFor(chance, refinement, wire.rarity),
    chance,
  };
}

export function normalizeRelic(wire: WireRelic): Relic {
  const tier = pick(wire.tier, TIERS, "lith");
  const refinement = pick(wire.state, REFINEMENTS, "intact");

  return {
    tier,
    relicName: wire.relicName,
    // The backend keeps tier and short name apart and expects them rejoined on
    // the way back in, so the composed name is built once here rather than at
    // each call site.
    fullName: wire.tier ? `${wire.tier} ${wire.relicName}` : wire.relicName,
    refinement,
    rewards: (wire.rewards ?? []).map((reward) => normalizeReward(reward, refinement)),
  };
}

const REFINEMENT_ORDER: Refinement[] = ["intact", "exceptional", "flawless", "radiant"];

/**
 * Collapses the flat state-per-row list into one entry per relic.
 *
 * Order is preserved from the response, which arrives grouped by tier and then
 * by relic — sorting here would throw that away for no gain.
 */
export function groupRelics(relics: Relic[]): RelicGroup[] {
  const byName = new Map<string, RelicGroup>();

  for (const relic of relics) {
    let group = byName.get(relic.fullName);
    if (!group) {
      group = {
        tier: relic.tier,
        relicName: relic.relicName,
        fullName: relic.fullName,
        states: {},
      };
      byName.set(relic.fullName, group);
    }
    group.states[relic.refinement] = relic.rewards;
  }

  return [...byName.values()];
}

/** First state that actually carries rewards, preferring Intact. */
export function firstState(group: RelicGroup): Refinement {
  return REFINEMENT_ORDER.find((r) => group.states[r]?.length) ?? "intact";
}

export { REFINEMENT_ORDER };

export function normalizeDropInfo(wire: WireDropInfo): DropInfo {
  return {
    mission: wire.mission,
    location: wire.location,
    rotation: wire.rotation,
    chance: parseChance(wire.chance),
  };
}
