import type { ItemPrice } from "../api/types";
import type { TrendNoteReason } from "../components/TrendNote";

/**
 * What a trend cell has to draw, once.
 *
 * Three surfaces ask the same question of the same two fields — the two
 * dialogs and the wishlist's parts table — and each of them used to answer it
 * with `trend == null`, which is true of a percentage still being fetched, of
 * an item nobody sells and of a market that did not answer alike.
 */
export type TrendCell =
  /** Nothing has been asked yet, or the answer has not landed. Draw a skeleton. */
  | { kind: "waiting" }
  | { kind: "moved"; percent: number }
  | { kind: "note"; reason: TrendNoteReason };

const WAITING: TrendCell = { kind: "waiting" };

/**
 * The rule, and the order of it is the meaning.
 *
 * A price the batch has no entry for is a price nobody has asked about yet, so
 * it waits. Past that the backend has spoken: a trend is a trend, and a gap
 * with no trend beside it is one of the three causes `TrendGap` names.
 *
 * The last case is the one worth reading twice. A null trend with no gap under
 * it is an item the price cache has not reached — the server sends both fields
 * empty for an entry it does not have — and that is a wait rather than a
 * verdict. Labelling it would put "never sold" under a part that shows a price
 * four seconds later, which is a worse answer than saying nothing yet.
 */
export function trendCell(price: ItemPrice | undefined): TrendCell {
  if (!price) return WAITING;
  if (price.trend !== null) return { kind: "moved", percent: price.trend };
  if (!price.trendGap) return WAITING;
  return { kind: "note", reason: price.trendGap };
}
