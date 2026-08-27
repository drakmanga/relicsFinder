import type { PriceMap, Relic, RelicPriceMap, Reward, Tier } from "../api/types";
import { expectedValue, squadValue, type VaultFilter } from "./rows";

/**
 * A band letter. Six of them, and E is skipped.
 *
 * E is missing because nobody reads it as a rank: the tier-list convention the
 * letters borrow from runs S A B C D F, and a reader who meets an E spends the
 * moment working out whether it sits above or below D. Five ranks plus a floor
 * is also as many distinctions as the underlying numbers can carry — see
 * `TIER_BANDS` for why the boundaries have to be as wide as they are.
 */
export type TierLetter = "S" | "A" | "B" | "C" | "D" | "F";

/**
 * Where each band starts, as a multiple of the population's median.
 *
 * Multiples rather than percentiles, and that is the whole design. Percentiles
 * would guarantee a fixed slice of the catalogue per letter, which sounds
 * fairer and is not: over thirty days the median relic moves 43 places on a
 * 0.39p change, because 327 relics are packed between 4p and 6p. A percentile
 * band cuts straight through that crowd, so a relic crosses a letter boundary
 * on noise nobody could act on. A multiple of the median is anchored to what
 * the relics are worth rather than to how many of them there are, so a 0.39p
 * wobble moves a relic by 0.39p and it stays where it was.
 *
 * The consequence is that the bands are not even, and band C — 0.8x to 1.2x the
 * median — holds roughly 45% of the catalogue. That is the honest answer rather
 * than a bug to be tuned away: nearly half the relics really are worth about
 * what the median relic is worth, and a scheme that spread them across four
 * letters would be inventing differences to fill the letters with.
 *
 * Descending, and read in order by `tierFor`, so the first band a value clears
 * is its band. Adding one means putting it in the right place here and nowhere
 * else.
 */
export const TIER_BANDS: readonly { readonly letter: TierLetter; readonly minMultiple: number }[] =
  [
    { letter: "S", minMultiple: 2 },
    { letter: "A", minMultiple: 1.5 },
    { letter: "B", minMultiple: 1.2 },
    { letter: "C", minMultiple: 0.8 },
    { letter: "D", minMultiple: 0.6 },
  ];

/** Below the last band in `TIER_BANDS`. It has no multiple: it is what is left. */
export const LOWEST_BAND: TierLetter = "F";

/** Every letter, best first. Derived, so a legend cannot fall out of step with the bands. */
export const TIER_LETTERS: readonly TierLetter[] = [
  ...TIER_BANDS.map((band) => band.letter),
  LOWEST_BAND,
];

/**
 * The squad a radshare is: four players, four relics, one reward kept.
 *
 * Four rather than a number the reader picks, because this column is a fixed
 * comparison against the solo one and not a calculator — the Relics view
 * already answers "what about a squad of three". Two fixed columns is the point
 * of the tab: solo and squad-of-4 share only 11 of their top 20, with a median
 * rank shift of 53 places and a maximum of 376, so a single blended number
 * would be wrong for both ways of playing.
 */
export const RADSHARE_PLAYERS = 4;

/**
 * Trades in ninety days before the sell badge is allowed to appear.
 *
 * Relic prices are thin — a median of 6 completed trades in ninety days, two
 * thirds of the catalogue under ten — so a relic listed at 190p is usually one
 * lucky sale rather than a market. The badge tells someone to sell instead of
 * open, which is irreversible, so it may only speak where there is a market to
 * sell into. Ten is the level at which the listing stops being an anecdote; it
 * is deliberately not zero-or-more, and `tradeCount90d` being null means nobody
 * has asked yet rather than that nobody traded.
 */
export const SELL_BADGE_MIN_TRADES = 10;

/**
 * How far the expected value must have moved over ninety days to earn an arrow.
 *
 * Ten percent for the same reason the bands are multiples: below it the arrow
 * would be reporting the noise of a thin market, and an arrow on every row
 * points at nothing. Inclusive — a relic exactly ten percent up has cleared the
 * bar — matching the bands, which are inclusive at their lower edge too.
 */
export const TREND_ARROW_THRESHOLD = 10;

/**
 * One relic, ranked twice.
 *
 * `tier` is the relic's tier (Lith, Meso …); the band letters are `soloLetter`
 * and `radshareLetter`. The two words collide in this file and the fields are
 * named so a reader never has to work out which one is meant.
 */
export interface TierListRow {
  /** `"Lith V9"` — one row per relic, not per relic-and-refinement. */
  relicFullName: string;
  tier: Tier;
  /** Expected platinum from one solo run of the Intact relic. */
  soloValue: number;
  /** Expected platinum from one run of the Radiant relic in a squad of four. */
  radshareValue: number;
  /** Null when there is no median to rank against — see `tierFor`. */
  soloLetter: TierLetter | null;
  radshareLetter: TierLetter | null;
  /**
   * What the relic itself sells for. Beside the letters, never inside them.
   */
  relicPrice: number | null;
  /** Whether selling the relic beats opening it, and is attested enough to say so. */
  worthSelling: boolean;
  /**
   * Percent the solo expected value has moved against its ninety-day baseline,
   * or null when it has not moved enough to be worth an arrow.
   */
  trend: number | null;
}

/**
 * The rows and the two medians they were ranked against.
 *
 * Two medians rather than one, because the columns are two different scales:
 * best-of-four pays about three times what one roll does, so ranking both
 * against a single median would put the entire radshare column in S and the
 * entire solo column in F. A letter says where a relic sits among the relics in
 * that column, which is only meaningful per column.
 *
 * The medians are returned rather than kept private because the view states
 * them — "S is 2x the median, and the median is 5.1p" is what stops the letters
 * reading as a verdict handed down from somewhere.
 */
export interface TierList {
  rows: TierListRow[];
  /** Null when nothing is on screen. */
  soloMedian: number | null;
  radshareMedian: number | null;
}

/**
 * The middle value of a population.
 *
 * Written out rather than pulled in, because it is four lines and the two
 * decisions in it are ones a dependency would make silently.
 *
 * Even-length populations take the mean of the two middle values, the ordinary
 * definition. Picking the lower of the pair would have been defensible on a
 * catalogue this crowded — half the relics sit within a platinum of each other,
 * so the two middles are usually the same number anyway — but it biases every
 * band boundary downwards by half a gap, and a boundary that moves with the
 * parity of the row count is a boundary nobody can reason about.
 *
 * An empty population has no median at all, and null says so. Zero would be a
 * claim about the relics, and the letters computed from it would rank every
 * relic S: a value of zero clears two times zero.
 */
export function medianOf(values: number[]): number | null {
  if (values.length === 0) return null;

  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);

  // Both indices are in range — the empty population returned above — which
  // `noUncheckedIndexedAccess` cannot see from here.
  if (sorted.length % 2 === 1) return sorted[middle]!;
  return (sorted[middle - 1]! + sorted[middle]!) / 2;
}

/**
 * The band a value falls in, given the median of the population it belongs to.
 *
 * Boundaries are inclusive at the bottom: exactly twice the median is S, not A.
 * The bands have to partition the range with no gap and no overlap, so each one
 * owns its own lower edge and the value is compared once, against the first
 * band it clears.
 *
 * Null rather than F when there is no median, or when the median is zero. That
 * happens for real: before the price batch lands every expected value is zero,
 * and a population where the middle relic is worth nothing gives every
 * multiple the same boundary — zero — so every relic would be handed an S. No
 * median, no letter; the view shows the values and leaves the column blank.
 */
export function tierFor(value: number, median: number | null): TierLetter | null {
  if (median === null || median <= 0) return null;

  return TIER_BANDS.find((band) => value >= band.minMultiple * median)?.letter ?? LOWEST_BAND;
}

/**
 * The same prices as they stood ninety days ago.
 *
 * `ItemPrice.trend` is the percent the price stands at against its ninety-day
 * average, so the average it is measured against is `price / (1 + trend/100)`.
 * Rebuilding the whole map once per call, rather than per relic: 596 parts are
 * cheaper to re-price once than to re-derive six at a time across 772 relics.
 *
 * A part with no trend keeps its current price as its own baseline. Dropping it
 * instead would compare a five-drop relic against a six-drop one and report the
 * missing drop as a price movement, which is the one thing this number must not
 * do. A trend of exactly -100 — the price is nothing against its average —
 * would divide by zero, and gets the same treatment for the same reason.
 */
function ninetyDayBaseline(prices: PriceMap | undefined): PriceMap | undefined {
  if (!prices) return undefined;

  const baseline: PriceMap = new Map();

  for (const [itemName, item] of prices) {
    const factor = 1 + (item.trend ?? 0) / 100;

    baseline.set(itemName, {
      ...item,
      averagePrice:
        item.averagePrice === null || factor === 0 ? item.averagePrice : item.averagePrice / factor,
    });
  }

  return baseline;
}

/**
 * The movement between two expected values, reported only once it is worth an
 * arrow. Null when there is no baseline to move away from.
 */
function trendBetween(today: number, ninetyDaysAgo: number): number | null {
  if (ninetyDaysAgo <= 0) return null;

  // Multiplied before it is divided, which is not cosmetic: the other
  // association divides first and hands the gate a number a rounding step off
  // the threshold, so a relic sitting exactly on ten percent lands on
  // whichever side the last bit fell. This way it lands on ten.
  const percent = ((today - ninetyDaysAgo) * 100) / ninetyDaysAgo;
  return Math.abs(percent) >= TREND_ARROW_THRESHOLD ? percent : null;
}

/**
 * `applyVaultFilter`'s rule, applied to a relic name instead of a table row.
 *
 * The same three-way semantics, deliberately not the same function: that one
 * takes `RelicRow[]`, and a tier-list row is not one — manufacturing rows to
 * feed a filter and then throwing them away would cost more than the line it
 * saves. Like there, an absent rotation passes everything: the honest answer to
 * "which of these are still dropping" is not yet known, and the alternative is
 * an empty tab for as long as that request takes.
 */
function inVaultPopulation(
  fullName: string,
  vault: VaultFilter,
  unvaulted: Set<string> | undefined,
): boolean {
  if (vault === "all" || !unvaulted) return true;
  return unvaulted.has(fullName) === (vault === "farmable");
}

/** The two states this view reads, collected per relic. */
interface RelicStates {
  tier: Tier;
  intact: Reward[];
  radiant: Reward[];
}

/**
 * Every relic on screen, ranked twice: solo and radshare.
 *
 * The two columns are fixed at "solo, Intact" and "radshare, Radiant" because
 * those are the two ways relics are actually opened, and pairing each play
 * pattern with the refinement it uses is what makes the tab worth building: the
 * two columns share 4 of their top 20, the median relic moves 111 places
 * between them, and 59% of the catalogue lands in a different band depending on
 * which column is read. Solo does not refine — a hundred void traces per run is
 * a cost a solo player is not paying to open a Lith relic — and a radshare has
 * spent them before anyone looks at the reward screen.
 *
 * The population, and therefore both medians, is whatever the vault filter
 * leaves. Ranking the farmable relics against the whole catalogue would put
 * essentially all of them in D or F: only 34 of 772 relics are currently
 * dropping and they cluster at the bottom, so "which of the relics I can still
 * farm is worth farming" — the actual question — would come back as "none of
 * them".
 *
 * The owned-parts list is deliberately not a parameter. A duplicate still
 * sells, so a part already in the foundry does not make the relic that drops it
 * worth less; and a tier list personalised per reader cannot be shared through
 * the URL, which is how every other screen in this app is handed over.
 */
export function buildTierList(
  relics: Relic[],
  prices: PriceMap | undefined,
  relicPrices: RelicPriceMap | undefined,
  unvaulted: Set<string> | undefined,
  vault: VaultFilter,
): TierList {
  const baseline = ninetyDayBaseline(prices);
  const states = new Map<string, RelicStates>();

  for (const relic of relics) {
    if (relic.refinement !== "intact" && relic.refinement !== "radiant") continue;
    if (!inVaultPopulation(relic.fullName, vault, unvaulted)) continue;

    const entry = states.get(relic.fullName) ?? { tier: relic.tier, intact: [], radiant: [] };
    entry[relic.refinement] = relic.rewards;
    states.set(relic.fullName, entry);
  }

  const unranked = [...states.entries()].map(([relicFullName, { tier, intact, radiant }]) => {
    const soloValue = expectedValue(intact, prices);

    // The hundred void traces a Radiant costs are deliberately NOT subtracted
    // here, and this is a known limit rather than an oversight. Traces have no
    // market price, so converting them to platinum would mean inventing an
    // exchange rate and letting an invented number decide a letter — the same
    // mistake that keeps the relic's own price out of the ranking. The column
    // reads as gross value, and the reader supplies the trace cost.
    const radshareValue = squadValue(radiant, prices, RADSHARE_PLAYERS);

    const listing = relicPrices?.get(relicFullName);
    const relicPrice = listing?.averagePrice ?? null;
    const trades = listing?.tradeCount90d ?? null;

    return {
      relicFullName,
      tier,
      soloValue,
      radshareValue,
      relicPrice,
      // Measured against the solo Intact column: that is the state the relic is
      // in while it sits in the inventory, and opening it that way costs
      // nothing beyond the run. Comparing against the radshare column instead
      // would let the un-subtracted trace cost above decide whether the badge
      // appears. A tie leaves it off — selling and opening paying the same is
      // not a reason to do something different.
      worthSelling:
        trades !== null &&
        trades >= SELL_BADGE_MIN_TRADES &&
        relicPrice !== null &&
        relicPrice > soloValue,
      // One arrow per row, on the solo expected value. Both columns move with
      // the same six prices, so a second arrow would say very nearly the same
      // thing in twice the width.
      trend: trendBetween(soloValue, expectedValue(intact, baseline)),
    };
  });

  // After the vault filter and before the letters: the median is a fact about
  // the population on screen, and computing it earlier would rank these relics
  // against relics the reader cannot see.
  const soloMedian = medianOf(unranked.map((row) => row.soloValue));
  const radshareMedian = medianOf(unranked.map((row) => row.radshareValue));

  return {
    // By name, matching the Relics table's own relic column. Not by either
    // value: the tab exists because the two columns disagree, so opening it
    // sorted by one of them would answer the question before it was asked. The
    // view sorts.
    rows: unranked
      .map((row) => ({
        ...row,
        soloLetter: tierFor(row.soloValue, soloMedian),
        radshareLetter: tierFor(row.radshareValue, radshareMedian),
      }))
      .sort((a, b) => a.relicFullName.localeCompare(b.relicFullName, "en", { numeric: true })),
    soloMedian,
    radshareMedian,
  };
}
