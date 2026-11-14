import { Button } from "relic-finder-ui";

import { REFINEMENT_LABEL } from "../lib/rows";
import { crackLine, formatCrackValue, type CrackRow, type CrackVerdict } from "../lib/relicCrack";
import type { OwnedRelic } from "../api/types";

interface Props {
  row: CrackRow;
  /** Under a fissure's heading, which already says where: the row drops its "open now on" line. */
  grouped: boolean;
  onOpened: (relic: OwnedRelic) => void;
  now: number;
}

/** In words as well as in colour (§5.1): the verdict is the first thing read. */
const VERDICT_LABEL: Record<CrackVerdict, string> = {
  open: "Open",
  wait: "Wait",
  unpriced: "No price",
};

/**
 * One held relic in the ranking: the verdict, the name and the line that says
 * where or why not yet on the left; the figures and the button that spends a
 * copy on the right, stacked.
 *
 * Stacked rather than the button under the sentence: there it shared a row
 * with the refining advice and wrapped onto a line of its own whenever the
 * advice was there, so rows changed height and the button changed place.
 */
export function CrackRowItem({ row, grouped, onOpened, now }: Props) {
  const label = `${row.relic.relicName} ${REFINEMENT_LABEL[row.relic.refinement]}`;
  const showLine = !(grouped && row.verdict === "open");

  return (
    <>
      <span className="rf-text-overline rf-crack-verdict">{VERDICT_LABEL[row.verdict]}</span>

      <div className="rf-crack-row-body">
        <span className="rf-crack-row-name">
          {row.relic.relicName}{" "}
          <span className="rf-text-caption rf-fg-muted">
            {REFINEMENT_LABEL[row.relic.refinement]} × {row.relic.quantity}
          </span>
        </span>
        {showLine && (
          <p className="rf-text-body-sm rf-fg-secondary rf-crack-line">
            {row.tier ? crackLine(row, row.tier, now) : "not in the relic catalogue any more"}
          </p>
        )}
        {row.refine && (
          <p className="rf-text-caption rf-fg-muted rf-crack-refine">
            Refine to {REFINEMENT_LABEL[row.refine.to]}: +
            {formatCrackValue(row.refine.gain, "plat")} a run for {row.refine.traces} traces
          </p>
        )}
      </div>

      <div className="rf-crack-row-side">
        {/* Both currencies on every row, each as "a run" and "per minute".
            The order is platinum's; ducats ride along. */}
        <dl className="rf-tabular rf-text-body-sm rf-crack-figures">
          <div>
            <dt className="rf-text-caption rf-fg-muted">a run</dt>
            <dd>
              {formatCrackValue(row.value, "plat")} · {formatCrackValue(row.ducats, "ducats")}
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

        {/* Here and not only in the inventory: the reader has just opened the
            relic this row told them to, and walking back to find it in a list
            of hundreds is how an inventory stops matching the game after one
            session. */}
        <Button
          variant="outline"
          size="sm"
          className="rf-hit-block"
          aria-label={`Opened one ${label}`}
          onClick={() => onOpened(row.relic)}
        >
          Opened one
        </Button>
      </div>
    </>
  );
}
