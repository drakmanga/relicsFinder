import { Skeleton } from "relic-finder-ui";

import { PHASE_LABEL, PHASE_MEANS, phaseDate } from "../lib/lifecycle";
import type { PhaseCell } from "../lib/lifecycle";

/**
 * Whether a Prime set still comes out of relics, in one or two words.
 *
 * The colour follows the relics table's own Status column rather than the
 * price delta beside it, and the two conventions genuinely disagree: green
 * there means "still droppable", green on a delta means "the price went up",
 * and a set that is dropping is the one whose price is falling. Matching the
 * delta would paint the word "Dropping" red here and green two tabs away for
 * the same fact, so the colour says availability and the word beside it,
 * plus the sentence in the panel, says direction.
 *
 * Never the only channel either: the label is the answer, and the colour only
 * makes it scannable down a column of two hundred rows.
 */
export function SetPhaseBadge({ cell }: { cell: PhaseCell }) {
  if (cell.kind === "waiting") return <Skeleton width={64} height={14} />;

  return <span className={`rf-phase rf-phase-${cell.phase}`}>{PHASE_LABEL[cell.phase]}</span>;
}

/**
 * The same verdict with its reason, for a detail surface.
 *
 * The sentence is on the screen and not in a `title`: a badge explained only on
 * hover is an explanation a sighted reader never gets, a touch reader cannot
 * reach and nobody can search for — the rule `TrendNote` was built to, for the
 * same reason.
 *
 * The date is the part that makes it checkable. "Just vaulted" is a claim;
 * "stopped dropping on 2025-05-21" is the fact it rests on, and a reader who
 * disagrees can see which of the two to argue with.
 */
export function SetPhaseNote({ cell }: { cell: PhaseCell }) {
  if (cell.kind === "waiting") return <Skeleton width={200} height={14} />;

  const date = phaseDate(cell);

  return (
    <p className="rf-flush rf-text-caption rf-fg-muted">
      <SetPhaseBadge cell={cell} /> {PHASE_MEANS[cell.phase]}
      {date && (
        <>
          {" "}
          {date.label} {date.date}.
        </>
      )}
    </p>
  );
}
