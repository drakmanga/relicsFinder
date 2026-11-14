import type { RefObject } from "react";

import { CrackGroupHead } from "./CrackGroupHead";
import { CrackRowItem } from "./CrackRowItem";
import { crackLines } from "../lib/crackGroups";
import { useVirtualList } from "../lib/useVirtualList";
import type { OwnedRelic } from "../api/types";
import type { CrackRow } from "../lib/relicCrack";

interface Props {
  rows: CrackRow[];
  /** One block per fissure instead of one ranked line per relic. */
  byFissure: boolean;
  /** The tab's scrolling pane, which the list scrolls with. */
  pane: RefObject<HTMLElement | null>;
  /** One copy of this relic was just opened: take it off the inventory. */
  onOpened: (relic: OwnedRelic) => void;
  now: number;
}

/**
 * A line's height before it is measured, at 1440px. Each line is measured as
 * it renders, so this only decides how much the scrollbar settles.
 */
const LINE_HEIGHT = 96;

/**
 * The held relics, best to open first, each with the one line that says where
 * or why not yet; or, grouped, the same rows under the fissure to open them in.
 *
 * A list rather than a table: every row is a sentence ("open now on Hepit -
 * Capture, expires in 30 min") with two figures beside it, and a sentence
 * does not fit a column at 360px.
 */
export function CrackRanking({ rows, byFissure, pane, onOpened, now }: Props) {
  const lines = crackLines(rows, byFissure);
  const { listRef, items, measureElement } = useVirtualList<HTMLOListElement>(
    lines.length,
    pane,
    LINE_HEIGHT,
  );

  return (
    <ol
      ref={listRef}
      className="rf-crack-ranking rf-virtual"
      aria-label={byFissure ? "Relics grouped by fissure" : "Relics ranked by value per minute"}
    >
      {items.map((item) => {
        const line = lines[item.index]!;
        return (
          <li
            key={line.key}
            ref={measureElement}
            data-index={item.index}
            className={
              line.kind === "head"
                ? "rf-crack-group"
                : `rf-crack-row rf-crack-row-${line.row.verdict}`
            }
          >
            {line.kind === "head" ? (
              <CrackGroupHead group={line.group} now={now} />
            ) : (
              <CrackRowItem row={line.row} grouped={line.grouped} onOpened={onOpened} now={now} />
            )}
          </li>
        );
      })}
    </ol>
  );
}
