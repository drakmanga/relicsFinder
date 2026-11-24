/**
 * The arithmetic behind the Kuva tab: weekly ceilings, the reset clock and
 * Teshin's rotation. The figures themselves live in `kuvaSources`.
 */
import type { KuvaReward, KuvaVendor } from "./kuvaSources";

const DAY_MS = 86_400_000;
export const WEEK_MS = 7 * DAY_MS;

/**
 * The Monday the Steel Path Honors rotation started counting from, and how
 * long the rotation is. These are the constants warframestat's worldstate
 * parser uses, and they agree with its live feed: the week of 2026-11-23 is
 * slot 2, Kitgun Riven Mod. Computed here rather than fetched because the
 * rotation is a calendar, not a server state — it needs no network to know.
 */
const STEEL_PATH_EPOCH = Date.UTC(2020, 10, 16);
const STEEL_PATH_ROTATION_WEEKS = 8;
/** The slot of the eight that carries the 50,000 Kuva bundle. */
const STEEL_PATH_KUVA_SLOT = 1;

/**
 * The next weekly reset, Monday 00:00 UTC. Every capped vendor here restocks
 * on it, which is why the tab counts down to one moment and not several.
 */
export function nextWeeklyReset(now: number): number {
  // 1970-01-01 was a Thursday, so weeks counted from the epoch roll over on
  // Thursdays; shifting by four days makes them roll over on Mondays.
  const MONDAY_SHIFT = 4 * DAY_MS;
  const sinceMonday = (((now - MONDAY_SHIFT) % WEEK_MS) + WEEK_MS) % WEEK_MS;
  return now - sinceMonday + WEEK_MS;
}

/** The Monday 00:00 UTC the current week started on. */
export const weekStartOf = (now: number) => nextWeeklyReset(now) - WEEK_MS;

export interface RotationStatus {
  /** True while the 50,000 bundle is in the shop. */
  thisWeek: boolean;
  /** Whole weeks until it is next in the shop; 0 when it is there now. */
  weeksAway: number;
  /** When it next appears, or when the current one leaves if it is there now. */
  at: number;
}

export function steelPathKuvaRotation(now: number): RotationStatus {
  const week = Math.floor((now - STEEL_PATH_EPOCH) / WEEK_MS);
  const slot =
    ((week % STEEL_PATH_ROTATION_WEEKS) + STEEL_PATH_ROTATION_WEEKS) % STEEL_PATH_ROTATION_WEEKS;
  const thisWeekStart = STEEL_PATH_EPOCH + week * WEEK_MS;
  if (slot === STEEL_PATH_KUVA_SLOT) {
    return { thisWeek: true, weeksAway: 0, at: thisWeekStart + WEEK_MS };
  }
  const weeksAway =
    (STEEL_PATH_KUVA_SLOT - slot + STEEL_PATH_ROTATION_WEEKS) % STEEL_PATH_ROTATION_WEEKS;
  return { thisWeek: false, weeksAway, at: thisWeekStart + weeksAway * WEEK_MS };
}

/** Kuva one vendor can sell in a week, or null when it has no limit. */
export const weeklyKuva = (vendor: KuvaVendor): number | null =>
  vendor.weeklyLimit === null ? null : vendor.kuva * vendor.weeklyLimit;

/**
 * Most Kuva the capped vendors sell in one week. The rotating offer counts
 * only in the week it is actually in the shop: a ceiling that included it
 * every week would be a number no week ever reaches.
 */
export function weeklyVendorCeiling(vendors: KuvaVendor[], rotationThisWeek: boolean): number {
  return vendors.reduce((sum, vendor) => {
    if (vendor.rotating && !rotationThisWeek) return sum;
    return sum + (weeklyKuva(vendor) ?? 0);
  }, 0);
}

/**
 * Biggest weekly total first, the uncapped vendors last. Capped offers are the
 * ones a player loses by not visiting before the reset, so they lead; the two
 * without a limit are the overflow for whatever currency is left.
 */
export function orderVendors(vendors: KuvaVendor[]): KuvaVendor[] {
  return [...vendors].sort((a, b) => {
    const wa = weeklyKuva(a);
    const wb = weeklyKuva(b);
    if (wa === null || wb === null) return wa === null ? (wb === null ? 0 : 1) : -1;
    return wb - wa;
  });
}

const CADENCE_ORDER = { weekly: 0, daily: 1, baro: 2, season: 3 } as const;

/**
 * Weekly first, then by how much a claim pays at best. Certain rewards and
 * rolls are mixed on purpose: the chance column says which is which, and
 * sorting on an expected value would bury the 1% that pays 100,000.
 */
export function orderRewards(rewards: KuvaReward[]): KuvaReward[] {
  const top = (reward: KuvaReward) =>
    typeof reward.kuva === "number" ? reward.kuva : reward.kuva[1];
  return [...rewards].sort(
    (a, b) => CADENCE_ORDER[a.cadence] - CADENCE_ORDER[b.cadence] || top(b) - top(a),
  );
}

const KUVA_FORMAT = new Intl.NumberFormat("en-US");

/** "10,000", or "7,000–21,000" for a range. */
export function kuvaLabel(kuva: number | readonly [number, number]): string {
  return typeof kuva === "number"
    ? KUVA_FORMAT.format(kuva)
    : `${KUVA_FORMAT.format(kuva[0])}–${KUVA_FORMAT.format(kuva[1])}`;
}

/** "4d 9h", "3h 12m", "8m": the two largest units, which is all a reset needs. */
export function countdownLabel(ms: number): string {
  const minutes = Math.max(0, Math.floor(ms / 60_000));
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const mins = minutes % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}
