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

const TIERS: Tier[] = ["lith", "meso", "neo", "axi", "requiem", "vanguard"];
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
 * Rarity is taken as sent.
 *
 * The source data mislabels it — every 25.33% drop is tagged "Uncommon" when it
 * is Common — but the correction now happens in RelicLoadService, on the way out
 * of the backend, so every client gets it right without carrying a copy of the
 * chance-to-rarity table. Do not reintroduce that table here.
 */
export function normalizeReward(wire: WireRewards): Reward {
  return {
    id: wire._id,
    itemName: wire.itemName,
    rarity: pick(wire.rarity, RARITIES, "common"),
    chance: parseChance(wire.chance),
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
    rewards: (wire.rewards ?? []).map(normalizeReward),
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
