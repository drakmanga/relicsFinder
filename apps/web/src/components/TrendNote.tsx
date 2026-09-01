import { PriceDelta, Skeleton } from "relic-finder-ui";

import type { TrendGap } from "../api/types";
import type { TrendCell } from "../lib/trend";

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
 *
 * Exported because two of these words are also glossary entries. The tier
 * list's Trend column answers in words as often as in numbers, and the primer
 * defines what it prints — reading the word from here rather than repeating it,
 * so a reworded label cannot leave a glossary defining a word the column no
 * longer says. The same reason `VAULT_LABEL` is read rather than repeated a few
 * lines above it there.
 */
export const TREND_LABEL: Record<TrendNoteReason, string> = {
  steady: "Steady",
  "too-few-sales": "Too few sales",
  "no-listings": "Never sold",
  "no-answer": "Lookup failed",
  "no-baseline": "Nothing to compare",
};

export function TrendNote({ reason }: { reason: TrendNoteReason }) {
  return <span className="rf-trend-note">{TREND_LABEL[reason]}</span>;
}

/**
 * The two shapes a trend is read in, and the skeleton each of them waits as.
 *
 * A placeholder the size of the thing it replaces is the whole point of one:
 * the table row must not change height as prices land under a reader's eyes,
 * and the dialogs' stat grid must not reflow when the fourth figure arrives.
 * Both numbers are the ones those surfaces already use for the price beside
 * this cell.
 */
const SKELETON = {
  cell: { width: 44, height: 14 },
  stat: { width: 48, height: 20 },
};

/**
 * A movement, the reason there is none, or the wait for either.
 *
 * One renderer for all four surfaces. They had four copies of
 * `trend == null ? dash : arrow` between them, which is how the Tier List came
 * to claim "Steady" about a number nobody had measured while the two dialogs
 * said nothing at all about the same absence.
 */
export function TrendValue({ cell, size }: { cell: TrendCell; size: keyof typeof SKELETON }) {
  if (cell.kind === "waiting") return <Skeleton {...SKELETON[size]} />;
  if (cell.kind === "moved") return <PriceDelta value={Math.round(cell.percent)} />;
  return <TrendNote reason={cell.reason} />;
}
