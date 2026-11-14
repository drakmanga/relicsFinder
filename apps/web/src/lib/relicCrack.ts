import type { Fissure, FissureFeed, OwnedRelic, PriceMap, Relic, Tier } from "../api/types";
import type { CrackOptions } from "./crackOptions";
import { squadValueBy } from "./rows";

/**
 * Which held relic to open, and where, given the fissures up right now.
 *
 * A relic's score in a fissure is what it pays per minute there: its expected
 * value (platinum or ducats, alone or in a radshare) over the minutes one round
 * of that mission takes. The same Axi relic is worth five times as much per
 * minute in a Capture as in a Survival, which is the whole reason this tab
 * exists.
 *
 * Every function here is pure: the fissures, the prices and the clock are
 * handed in, so a fixture can pin a verdict to the minute.
 */

/**
 * The share of the best possible rate a fissure has to reach to be worth it.
 *
 * "Best possible" is the same relic in the fastest mission type there is, open
 * or not. Half, because one mission type a step slower than Capture is still
 * worth playing now, while a Survival at a fifth of the rate is worth waiting
 * an hour for the rotation to bring something better.
 */
export const OPEN_THRESHOLD = 0.5;

/**
 * How much slower a Steel Path mission counts when the reader asks for it to.
 *
 * One and a half: enemies with a hundred times the health do not make a
 * Capture take five minutes, but a player who finds Steel Path hard spends
 * longer killing their way to the target and longer recovering from a down.
 * Off by default — for a player at home there, Steel Path is the same mission
 * with better drops, and penalising it would hide the fissure they want.
 */
export const STEEL_PATH_PENALTY = 1.5;

const MS_PER_MINUTE = 60_000;

/** The fissure tier a relic tier opens in. Vanguard has no fissure of its own. */
const FISSURE_TIER: Record<Tier, string | null> = {
  lith: "Lith",
  meso: "Meso",
  neo: "Neo",
  axi: "Axi",
  requiem: "Requiem",
  vanguard: null,
};

/** Omnia fissures accept a relic of any tier. */
const OMNIA = "Omnia";

export type CrackVerdict = "open" | "wait" | "unpriced";

export interface FissureChoice {
  fissure: Fissure;
  /** Minutes the score was computed with, the Steel Path penalty included. */
  minutes: number;
  /** Value per minute. */
  score: number;
}

export interface CrackRow {
  key: string;
  relic: OwnedRelic;
  /** From the catalogue; null for a held relic the catalogue no longer lists. */
  tier: Tier | null;
  /** What one opening pays, in the chosen currency and squad size. */
  value: number;
  /** The best open fissure for this relic under the filters, if any. */
  best: FissureChoice | null;
  verdict: CrackVerdict;
  /**
   * For a "wait": the soonest-expiring fissure this relic could open in. Null
   * when none is open at all.
   */
  soonest: Fissure | null;
}

/** A relic matches the fissures of its own tier, and every Omnia fissure. */
export function matchesTier(tier: Tier, fissure: Fissure): boolean {
  return fissure.tier === OMNIA || fissure.tier === FISSURE_TIER[tier];
}

/** The fissures the filters leave, with a time estimate and not yet expired. */
export function eligibleFissures(feed: FissureFeed, options: CrackOptions, now: number): Fissure[] {
  return feed.fissures.filter(
    (fissure) =>
      fissure.minutes !== null &&
      Date.parse(fissure.expiry) > now &&
      !options.excluded.has(fissure.missionType) &&
      (options.voidStorms || !fissure.voidStorm) &&
      (options.steelPath === "both" || fissure.steelPath === (options.steelPath === "only")),
  );
}

/** Minutes a relic takes in this fissure, with the Steel Path penalty when asked for. */
export function effectiveMinutes(fissure: Fissure, options: CrackOptions): number {
  const minutes = fissure.minutes ?? Infinity;
  return options.penaliseSteelPath && fissure.steelPath ? minutes * STEEL_PATH_PENALTY : minutes;
}

/**
 * The fastest mission type the reader would play, from the whole table.
 *
 * From the table rather than from the fissures up, because the threshold asks
 * how this fissure compares to the best the game offers, not to the best that
 * happens to be open. Excluded types are left out of it: a reader who will not
 * play Capture should not have every relic told to wait for one.
 */
export function fastestMinutes(feed: FissureFeed, options: CrackOptions): number | null {
  const rated = Object.entries(feed.missionMinutes)
    .filter(([type]) => !options.excluded.has(type))
    .map(([, minutes]) => minutes);
  return rated.length > 0 ? Math.min(...rated) : null;
}

/** What one opening of this relic pays, or 0 when nothing in it is priced. */
export function relicValue(
  catalogueEntry: Relic | undefined,
  prices: PriceMap | undefined,
  options: CrackOptions,
): number {
  if (!catalogueEntry || !prices) return 0;

  const valueOf = (itemName: string) => {
    const price = prices.get(itemName);
    return (options.currency === "ducats" ? price?.ducats : price?.averagePrice) ?? 0;
  };
  return squadValueBy(catalogueEntry.rewards, valueOf, options.players);
}

/**
 * Every held relic, scored and given a verdict, best first.
 *
 * Open before wait, because the open ones are what to do now; then by score.
 * A relic none of whose drops is priced cannot be scored at all and goes last,
 * rather than reading as "wait" — waiting would not change its value.
 */
export function rankCrack(
  owned: readonly OwnedRelic[],
  catalogue: readonly Relic[],
  prices: PriceMap | undefined,
  feed: FissureFeed,
  options: CrackOptions,
  now: number,
): CrackRow[] {
  const byKey = new Map(catalogue.map((relic) => [`${relic.fullName}|${relic.refinement}`, relic]));
  const fissures = eligibleFissures(feed, options, now);
  const fastest = fastestMinutes(feed, options);

  const rows = owned.map((relic): CrackRow => {
    const key = `${relic.relicName}|${relic.refinement}`;
    const entry = byKey.get(key);
    const value = relicValue(entry, prices, options);
    const matching = entry ? fissures.filter((fissure) => matchesTier(entry.tier, fissure)) : [];

    const best = matching
      .map((fissure) => {
        const minutes = effectiveMinutes(fissure, options);
        return { fissure, minutes, score: value / minutes };
      })
      .reduce<FissureChoice | null>(
        (top, choice) => (top === null || choice.score > top.score ? choice : top),
        null,
      );

    const soonest = matching.reduce<Fissure | null>(
      (first, fissure) =>
        first === null || Date.parse(fissure.expiry) < Date.parse(first.expiry) ? fissure : first,
      null,
    );

    const verdict: CrackVerdict =
      value <= 0
        ? "unpriced"
        : best !== null && fastest !== null && best.score >= OPEN_THRESHOLD * (value / fastest)
          ? "open"
          : "wait";

    return { key, relic, tier: entry?.tier ?? null, value, best, verdict, soonest };
  });

  const order: Record<CrackVerdict, number> = { open: 0, wait: 1, unpriced: 2 };
  return rows.sort(
    (a, b) =>
      order[a.verdict] - order[b.verdict] ||
      (b.best?.score ?? 0) - (a.best?.score ?? 0) ||
      a.relic.relicName.localeCompare(b.relic.relicName, undefined, { numeric: true }),
  );
}

/** Whole minutes until the fissure closes, never below one while it is open. */
export const minutesLeft = (fissure: Fissure, now: number) =>
  Math.max(1, Math.ceil((Date.parse(fissure.expiry) - now) / MS_PER_MINUTE));

/** The tier word a "wait" line names: the relic's own, as the game writes it. */
export const tierWord = (tier: Tier) => FISSURE_TIER[tier] ?? "Vanguard";

/**
 * The one line under a relic: where to open it, or why not yet.
 *
 * A "wait" states only what is certain — which fissures are up and when the
 * first of them closes — and never when a better one will appear: that would
 * need the fissure history this app does not keep.
 */
export function crackLine(row: CrackRow, tier: Tier, now: number): string {
  if (row.verdict === "unpriced") return "no price for its drops yet";

  if (row.verdict === "open" && row.best) {
    const { fissure } = row.best;
    const sp = fissure.steelPath ? " [SP]" : "";
    return `open now on ${fissure.node} - ${fissure.missionType}${sp}, expires in ${minutesLeft(fissure, now)} min`;
  }

  if (!row.soonest) return `wait - no ${tierWord(tier)} fissure open right now`;

  return `wait - only slow missions for ${tierWord(tier)} right now; the first expires in ${minutesLeft(row.soonest, now)} min`;
}

/** A value in the chosen currency, the way the rest of the app writes it: "12.7p", "29.5 ducats". */
export function formatCrackValue(value: number, currency: "plat" | "ducats"): string {
  const rounded = value >= 10 ? value.toFixed(0) : value.toFixed(1);
  return currency === "plat" ? `${rounded}p` : `${rounded} ducats`;
}
