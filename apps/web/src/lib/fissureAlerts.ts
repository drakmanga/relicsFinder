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

/**
 * How long notifications stay on, in hours the reader types. Never open-ended:
 * a quarter of an hour at least, and a cap the reader will not reach by
 * accident (999 h is six weeks) but that still keeps a typo like 10000 from
 * meaning "for ever".
 */
export const ALERT_HOURS = { min: 0.25, max: 999, initial: 1 } as const;

const HOUR_MS = 60 * 60_000;

/**
 * The typed hours as milliseconds, or null when they are not a duration the
 * switch accepts. A comma is read as a decimal point, as an Italian keyboard
 * types "1,5".
 */
export function alertDurationMs(typed: string): number | null {
  const hours = Number(typed.trim().replace(",", "."));
  if (!typed.trim() || !Number.isFinite(hours)) return null;
  if (hours < ALERT_HOURS.min || hours > ALERT_HOURS.max) return null;
  return hours * HOUR_MS;
}

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
