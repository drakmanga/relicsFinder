import { stillFilling, stillFillingCount } from "../api/queries";
import type { PriceMap, RelicPriceMap, TierPriceCoverage } from "../api/types";

/**
 * How far a price batch has got.
 *
 * The server answers the whole batch at once and fills it in afterwards, so the
 * first response is mostly empty and the request that carried it looks, to
 * react-query, entirely successful. `isPending` is therefore true for one round
 * trip and false for the several minutes that actually matter — which is why
 * every table used it to decide between a skeleton and an em dash and got the
 * answer wrong the moment the first response landed.
 *
 * This is the honest reading: how many of the prices asked for have arrived,
 * and whether the poll behind them is still running.
 */
export interface PriceProgress {
  /** Prices asked for. Zero when nothing has been requested yet. */
  total: number;
  /** How many of them have a number. */
  priced: number;
  /**
   * Whether more are still expected.
   *
   * False once the batch settles, including when it settles with prices
   * missing — past the `PRICE_RESIDUE` share in api/queries those are read as
   * untraded rather than late, and a row showing one should say so instead of
   * shimmering forever.
   */
  filling: boolean;
}

const NOTHING: PriceProgress = { total: 0, priced: 0, filling: false };

/** Progress over a batch of part prices. */
export function itemPriceProgress(prices: PriceMap | undefined, pending: boolean): PriceProgress {
  if (!prices) return { ...NOTHING, filling: pending };
  return measure([...prices.values()].map((price) => price.averagePrice));
}

/** Progress over a batch of whole-relic prices. */
export function relicPriceProgress(
  prices: RelicPriceMap | undefined,
  pending: boolean,
): PriceProgress {
  if (!prices) return { ...NOTHING, filling: pending };
  return measure([...prices.values()].map((price) => price.averagePrice));
}

/**
 * Progress over the prices behind the ranking, which this tab never holds.
 *
 * Two batches in one answer, because the Tier List draws both: the parts decide
 * whether the Trend column is waiting or has nothing to compare, and the
 * relics' own listings decide whether the price column shows a skeleton or "not
 * listed". They fill at different speeds, so they are reported apart.
 *
 * Undefined while the ranking itself is in flight: nothing has been asked yet,
 * and both columns are waiting rather than settled.
 */
export function tierPriceProgress(coverage: TierPriceCoverage | undefined): {
  pricesFilling: boolean;
  relicPricesFilling: boolean;
} {
  if (!coverage) return { pricesFilling: true, relicPricesFilling: true };

  return {
    pricesFilling: stillFillingCount(coverage.partsPriced, coverage.parts),
    relicPricesFilling: stillFillingCount(coverage.relicsPriced, coverage.relics),
  };
}

// The request's own pending state is not consulted here, and cannot be: a batch
// with data in it is a batch that has answered, and the two callers above deal
// with the first fetch — the only case where "pending" says anything this
// function could not work out for itself — before they ever get here. Reading it
// again would be a condition no execution can reach, which is a condition no
// test can defend.
function measure(values: (number | null)[]): PriceProgress {
  return {
    total: values.length,
    priced: values.filter((value) => value !== null).length,
    filling: stillFilling(values),
  };
}
