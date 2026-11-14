import { REFINEMENT_LABEL } from "../lib/rows";
import { crackLine, formatCrackValue, type CrackRow, type CrackVerdict } from "../lib/relicCrack";

interface Props {
  rows: CrackRow[];
  now: number;
}

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
export function CrackRanking({ rows, now }: Props) {
  return (
    <ol className="rf-crack-ranking" aria-label="Relics ranked by value per minute">
      {rows.map((row) => {
        return (
          <li key={row.key} className={`rf-crack-row rf-crack-row-${row.verdict}`}>
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

              <p className="rf-text-body-sm rf-fg-secondary rf-crack-line">
                {row.tier ? crackLine(row, row.tier, now) : "not in the relic catalogue any more"}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
