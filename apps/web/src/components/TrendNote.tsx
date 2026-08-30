import type { TrendGap } from "../api/types";

/**
 * What a trend column says when there is no percentage to put in it.
 *
 * Five causes end in the same empty cell and a reader deciding whether to
 * trust a price needs to tell them apart — above all a market too thin to have
 * a curve from one that does not exist at all. Four of them are named here;
 * the fifth, a price still being fetched, is not a cause but a wait, and the
 * caller draws the skeleton it draws for the number beside it.
 *
 * Words on the screen rather than a `title` and a screen-reader line, which is
 * what `Unlisted` does and why this is not that. A dash explained only on
 * hover is an explanation a sighted reader never gets, a touch reader cannot
 * reach, and nobody can search for.
 *
 * In `apps/web` on the placement test: "nobody has ever sold this" is a
 * sentence about a market, and a library component would have to carry the
 * vocabulary of one to know what to draw.
 */
export type TrendNoteReason =
  | TrendGap
  /** Measured, and under the threshold worth an arrow. An answer, not a gap. */
  | "steady"
  /** Nothing on the other side of the comparison — see lib/tierList. */
  | "no-baseline";

/**
 * One short phrase each, in the words of somebody who does not trade.
 *
 * No "unlisted", no "no data", no "n/a": each says what happened, and the two
 * that matter most say it in the reader's terms — an item that has never sold
 * against one that sells too rarely to draw a line through.
 */
const LABEL: Record<TrendNoteReason, string> = {
  steady: "Steady",
  "too-few-sales": "Too few sales",
  "no-listings": "Never sold",
  "no-answer": "Lookup failed",
  "no-baseline": "Nothing to compare",
};

export function TrendNote({ reason }: { reason: TrendNoteReason }) {
  return <span className="rf-trend-note">{LABEL[reason]}</span>;
}
