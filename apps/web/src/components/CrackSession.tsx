import { Button } from "relic-finder-ui";

import { REFINEMENT_LABEL } from "../lib/rows";
import { formatCrackValue } from "../lib/relicCrack";
import { sessionTotals, type SessionEntry } from "../lib/crackSession";

interface Props {
  entries: SessionEntry[];
  /** Takes one opening back: off the log, and the copy back in the inventory. */
  onUndo: (entry: SessionEntry) => void;
  onClear: () => void;
}

const clock = (at: number) =>
  new Date(at).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });

/**
 * The session log: what was opened with "Opened one", with its totals.
 *
 * Folded by default to the line of totals, which is what is read most; the
 * list of openings is there for a mis-click, not to be looked at all evening.
 */
export function CrackSession({ entries, onUndo, onClear }: Props) {
  const totals = sessionTotals(entries);

  return (
    <details className="rf-crack-session">
      <summary className="rf-focus-ring rf-hit-block rf-crack-filters-summary">
        <span className="rf-text-overline rf-fg-secondary">Session</span>
        <span className="rf-text-caption rf-fg-muted">
          {totals.opened === 0
            ? "nothing opened yet"
            : `${totals.opened} opened since ${clock(entries[0]!.at)} · ~${formatCrackValue(totals.value, "plat")} · ~${formatCrackValue(totals.ducats, "ducats")}`}
        </span>
      </summary>

      {entries.length === 0 ? (
        <p className="rf-text-caption rf-fg-muted rf-crack-session-empty">
          Each "Opened one" lands here, with what it was expected to pay.
        </p>
      ) : (
        <>
          {/* Newest first: the one to take back is nearly always the last. */}
          <ul className="rf-crack-session-list" aria-label="Relics opened this session">
            {[...entries].reverse().map((entry) => {
              const label = `${entry.relicName} ${REFINEMENT_LABEL[entry.refinement]}`;
              return (
                <li key={entry.id} className="rf-crack-session-row">
                  <span className="rf-text-caption rf-fg-muted rf-tabular">{clock(entry.at)}</span>
                  <span className="rf-text-body-sm rf-crack-session-name">{label}</span>
                  <span className="rf-text-caption rf-fg-secondary rf-tabular">
                    {formatCrackValue(entry.value, "plat")} ·{" "}
                    {formatCrackValue(entry.ducats, "ducats")}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="rf-hit-block"
                    aria-label={`Undo opening ${label}`}
                    onClick={() => onUndo(entry)}
                  >
                    Undo
                  </Button>
                </li>
              );
            })}
          </ul>
          <Button variant="outline" size="sm" className="rf-hit-block" onClick={onClear}>
            Start a new session
          </Button>
        </>
      )}
    </details>
  );
}
