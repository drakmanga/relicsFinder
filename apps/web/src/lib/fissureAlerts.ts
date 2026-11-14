import type { Fissure, FissureFeed, OwnedRelic } from "../api/types";
import type { CrackOptions } from "./crackOptions";
import { OPEN_THRESHOLD, effectiveMinutes, eligibleFissures, fastestMinutes } from "./relicCrack";
import { tierOfName } from "./ownedRelics";

/**
 * Which open fissures are worth a desktop notification, and what it says.
 *
 * Pure, like the ranking it borrows from: the hook that sends the
 * notifications (`useFissureAlerts`) only decides when to ask.
 */

/** How long notifications stay on, as the reader can choose it. Never open-ended. */
export const ALERT_DURATIONS = [
  { label: "30 min", ms: 30 * 60_000 },
  { label: "1 h", ms: 60 * 60_000 },
  { label: "2 h", ms: 2 * 60 * 60_000 },
] as const;

/** Omnia fissures accept every tier, so every held copy counts toward them. */
const OMNIA = "Omnia";

/** Copies held per tier word, "Neo" → 41. */
export function heldByTier(owned: readonly OwnedRelic[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const relic of owned) {
    const tier = tierOfName(relic.relicName);
    counts.set(tier, (counts.get(tier) ?? 0) + relic.quantity);
  }
  return counts;
}

/** How many held copies a fissure could take. */
export function copiesFor(fissure: Fissure, held: ReadonlyMap<string, number>): number {
  if (fissure.tier !== OMNIA) return held.get(fissure.tier) ?? 0;
  return [...held.values()].reduce((sum, copies) => sum + copies, 0);
}

/**
 * The fissures a notification is for: fast enough that a relic opened there
 * would be an "open" in the ranking, and of a tier the reader holds.
 *
 * The same half-the-fastest-rate bar the ranking uses, read on the minutes
 * alone: a relic's value cancels out of that comparison, so a fissure clears it
 * for every relic it accepts or for none of them.
 */
export function alertWorthy(
  feed: FissureFeed,
  options: CrackOptions,
  held: ReadonlyMap<string, number>,
  now: number,
): Fissure[] {
  const fastest = fastestMinutes(feed, options);
  if (fastest === null) return [];

  return eligibleFissures(feed, options, now).filter(
    (fissure) =>
      effectiveMinutes(fissure, options) <= fastest / OPEN_THRESHOLD &&
      copiesFor(fissure, held) > 0,
  );
}

/** The notification's two lines. */
export function alertText(fissure: Fissure, copies: number) {
  const sp = fissure.steelPath ? " (Steel Path)" : "";
  return {
    title: `${fissure.tier} ${fissure.missionType}${sp} on ${fissure.node}`,
    body: `You hold ${copies} relic${copies === 1 ? "" : "s"} it can open.`,
  };
}
