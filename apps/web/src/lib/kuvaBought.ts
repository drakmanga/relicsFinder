import { useKuvaPurchases, useUpdateKuvaPurchases } from "../api/queries";
import type { KuvaPurchases } from "../api/types";
import { weekStartOf } from "./kuva";
import type { KuvaVendor } from "./kuvaSources";

/**
 * How many of each capped Kuva offer the player has bought this week, and how
 * much Kuva each weekly reward has paid.
 *
 * On the server, like the wishlist and the relic inventory: the same player
 * ticks from more than one browser, and a tick in one has to be there in the
 * other.
 *
 * Stored with the week it belongs to, and that is the whole reset: a list from
 * an earlier week reads as empty, so Monday clears it with nothing having to
 * run at midnight — including on a tab left open across the reset.
 */
type BoughtWeek = KuvaPurchases;

export { weekStartOf };

const thisWeek = (stored: BoughtWeek | null, now: number) =>
  stored !== null && stored.week === weekStartOf(now);

/** This week's counts, or none when what is stored belongs to another week. */
export function countsFor(stored: BoughtWeek | null, now: number): Record<string, number> {
  return thisWeek(stored, now) ? (stored?.counts ?? {}) : {};
}

/** This week's reward amounts, under the same rule. */
export function rewardsFor(stored: BoughtWeek | null, now: number): Record<string, number> {
  return thisWeek(stored, now) ? (stored?.rewards ?? {}) : {};
}

/** The same ceiling the server holds, so a typo is clamped here and not refused there. */
const MAX_REWARD_KUVA = 1_000_000;

/** Kuva collected from one reward this week, never negative, never past the ceiling. */
export function setReward(
  stored: BoughtWeek | null,
  now: number,
  rewardId: string,
  kuva: number,
): BoughtWeek {
  const clamped = Math.max(0, Math.min(MAX_REWARD_KUVA, Math.round(kuva) || 0));
  return {
    week: weekStartOf(now),
    counts: countsFor(stored, now),
    rewards: { ...rewardsFor(stored, now), [rewardId]: clamped },
  };
}

/** Everything the weekly rewards have paid this week. */
export const rewardsObtained = (rewards: Record<string, number>): number =>
  Object.values(rewards).reduce((sum, kuva) => sum + kuva, 0);

/** A count can neither go below zero nor past the vendor's own limit. */
export function setCount(
  stored: BoughtWeek | null,
  now: number,
  vendor: KuvaVendor,
  count: number,
): BoughtWeek {
  const limit = vendor.weeklyLimit ?? 0;
  const clamped = Math.max(0, Math.min(limit, Math.round(count)));
  return {
    week: weekStartOf(now),
    counts: { ...countsFor(stored, now), [vendor.id]: clamped },
    rewards: rewardsFor(stored, now),
  };
}

/**
 * Kuva still on sale from the capped vendors this week. The rotating offer
 * counts only while it is in the shop, as in `weeklyVendorCeiling`.
 */
export function weeklyRemaining(
  vendors: KuvaVendor[],
  counts: Record<string, number>,
  rotationThisWeek: boolean,
): number {
  return vendors.reduce((sum, vendor) => {
    if (vendor.weeklyLimit === null || (vendor.rotating && !rotationThisWeek)) return sum;
    const left = Math.max(0, vendor.weeklyLimit - (counts[vendor.id] ?? 0));
    return sum + left * vendor.kuva;
  }, 0);
}

/**
 * Kuva already bought from the capped vendors this week: the other half of
 * `weeklyRemaining`, so the two always add up to the week's ceiling. The
 * rotating offer counts only while it is in the shop, for the same reason.
 */
export function weeklyBought(
  vendors: KuvaVendor[],
  counts: Record<string, number>,
  rotationThisWeek: boolean,
): number {
  return vendors.reduce((sum, vendor) => {
    if (vendor.weeklyLimit === null || (vendor.rotating && !rotationThisWeek)) return sum;
    const bought = Math.min(vendor.weeklyLimit, counts[vendor.id] ?? 0);
    return sum + bought * vendor.kuva;
  }, 0);
}

export function useKuvaBought(now: number) {
  const stored = useKuvaPurchases();
  const save = useUpdateKuvaPurchases();
  const counts = countsFor(stored.data ?? null, now);
  const rewards = rewardsFor(stored.data ?? null, now);

  const set = (vendor: KuvaVendor, count: number) =>
    save.update((current) => setCount(current, Date.now(), vendor, count));

  const setRewardKuva = (rewardId: string, kuva: number) =>
    save.update((current) => setReward(current, Date.now(), rewardId, kuva));

  return {
    counts,
    rewards,
    set,
    setReward: setRewardKuva,
    error: save.error,
  };
}
