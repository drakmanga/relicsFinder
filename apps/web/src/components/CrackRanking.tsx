import type { RefObject } from "react";
import { Button } from "relic-finder-ui";

import { REFINEMENT_LABEL } from "../lib/rows";
import { useVirtualList } from "../lib/useVirtualList";
import type { OwnedRelic } from "../api/types";
import { crackLine, formatCrackValue, type CrackRow, type CrackVerdict } from "../lib/relicCrack";

interface Props {
  rows: CrackRow[];
  /** The tab's scrolling pane, which the list scrolls with. */
  pane: RefObject<HTMLElement | null>;
  /** One copy of this relic was just opened: take it off the inventory. */
  onOpened: (relic: OwnedRelic) => void;
  now: number;
}

/**
 * A ranked row's height before it is measured: the average at 1440px, where
 * rows run 87 to 144px depending on the refining line. Each row is measured
 * as it renders, so this only decides how much the scrollbar settles.
 */
const ROW_HEIGHT = 119;

/** In words as well as in colour (§5.1): the verdict is the first thing read. */
const VERDICT_LABEL: Record<CrackVerdict, string> = {
  open: "Open",
  wait: "Wait",
  unpriced: "No price",
};

/**
 * The held relics, best to open first, each with the one line that says where
 * or why not yet.
 *
 * A list rather than a table: every row is a sentence ("open now on Hepit -
 * Capture, expires in 30 min") with two figures beside it, and a sentence
 * does not fit a column at 360px.
 */
export function CrackRanking({ rows, pane, onOpened, now }: Props) {
  const { listRef, items, measureElement } = useVirtualList<HTMLOListElement>(
    rows.length,
    pane,
    ROW_HEIGHT,
  );

  return (
    <ol
      ref={listRef}
      className="rf-crack-ranking rf-virtual"
      aria-label="Relics ranked by value per minute"
    >
      {items.map((item) => {
        const row = rows[item.index]!;
        return (
          <li
            key={row.key}
            ref={measureElement}
            data-index={item.index}
            className={`rf-crack-row rf-crack-row-${row.verdict}`}
          >
            <span className="rf-text-overline rf-crack-verdict">{VERDICT_LABEL[row.verdict]}</span>

            <div className="rf-crack-row-body">
              <div className="rf-crack-row-head">
                <span className="rf-crack-row-name">
                  {row.relic.relicName}{" "}
                  <span className="rf-text-caption rf-fg-muted">
                    {REFINEMENT_LABEL[row.relic.refinement]} × {row.relic.quantity}
                  </span>
                </span>

                {/* Both currencies on every row, each as "a run" and "per
                    minute". The order is platinum's; ducats ride along. */}
                <dl className="rf-tabular rf-text-body-sm rf-crack-figures">
                  <div>
                    <dt className="rf-text-caption rf-fg-muted">a run</dt>
                    <dd>
                      {formatCrackValue(row.value, "plat")} ·{" "}
                      {formatCrackValue(row.ducats, "ducats")}
                    </dd>
                  </div>
                  {row.best && (
                    <div>
                      <dt className="rf-text-caption rf-fg-muted">per min</dt>
                      <dd>
                        {formatCrackValue(row.best.score, "plat")} ·{" "}
                        {formatCrackValue(row.ducats / row.best.minutes, "ducats")}
                      </dd>
                    </div>
                  )}
                </dl>
              </div>

              <div className="rf-crack-row-foot">
                <p className="rf-text-body-sm rf-fg-secondary rf-crack-line">
                  {row.tier ? crackLine(row, row.tier, now) : "not in the relic catalogue any more"}
                </p>
                {/* Here and not only in the inventory: the reader has just
                    opened the relic this row told them to, and walking back to
                    find it in a list of hundreds is how an inventory stops
                    matching the game after one session. */}
                {row.refine && (
                  <p className="rf-text-caption rf-fg-muted rf-crack-refine">
                    Refine to {REFINEMENT_LABEL[row.refine.to]}: +
                    {formatCrackValue(row.refine.gain, "plat")} a run for {row.refine.traces} traces
                  </p>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="rf-hit-block"
                  aria-label={`Opened one ${row.relic.relicName} ${REFINEMENT_LABEL[row.relic.refinement]}`}
                  onClick={() => onOpened(row.relic)}
                >
                  Opened one
                </Button>
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
