/**
 * Over 150 lines (rule 4), and it is three rows of the same control answering
 * three questions about one list. What a split would produce is a chip-row
 * component taking a vocabulary, a label rule, a pressed rule, a handler, a
 * leading-hit-area flag and a trailing slot — the three rows are not the same
 * row — which is more surface than the markup it replaces and one strip
 * described in two files. The length here is comments and JSX, not logic that
 * could live elsewhere.
 */
import { ALL_PRIME_PHASES, PHASE_LABEL } from "../lib/lifecycle";
import {
  ALL_SET_STATUSES,
  SET_CATEGORY_LABEL,
  SET_STATUS_LABEL,
  availableCategories,
  type SetStatus,
} from "../lib/setCategories";
import type { PrimeSet } from "../lib/setCompletion";
import type { PrimePhase, SetCategory } from "../api/types";

interface Props {
  /** Every set the catalogue holds, before the filter — the chips come from it. */
  sets: PrimeSet[];
  selected: Set<SetCategory>;
  onChange: (next: Set<SetCategory>) => void;
  /** All sets, the unfinished, or the done. */
  status: SetStatus;
  onStatus: (next: SetStatus) => void;
  /** Phases on show. Empty is every phase, as with the kinds. */
  phases: Set<PrimePhase>;
  onPhases: (next: Set<PrimePhase>) => void;
  /** How many sets survive the current selection, for the count beside the chips. */
  shown: number;
}

/**
 * Which sets the Sets view is listing: what kind of gear, how far along, and
 * whether it still drops.
 *
 * Always open, unlike the filter bar on the catalogue views: this is three rows
 * of words rather than four groups of controls, and a collapsed bar with three
 * questions inside it costs more to open than it saves.
 *
 * The kinds and the phases are multi-select and nothing selected means
 * everything: the reader who wants frames and secondaries should not have to
 * ask twice, "just vaulted plus long vaulted" is the real question "everything
 * I can no longer farm", and the view has to open on the whole catalogue.
 * Progress is exclusive between them, because a set cannot be both finished and
 * not.
 *
 * The phase words come from `PHASE_LABEL`, which the badge in every row, the
 * detail panels and the search band all read too. A second list of words for
 * the same four values would be two glossaries for one idea, and the one that
 * was not edited would go on defining a word the column no longer says.
 */
/* Rule 7: the chips are drawn 27.6px tall — a line box rather than a declared
   number — and `rf-hit-block` takes the box a pointer lands in to 43.6 without
   moving any of that ink, which the walk rounds to the 44 the design means. The
   extra 8px reaches into the strip's own padding, which nothing else answers
   to, and stays inside the 8px row gap when the chips wrap. */
const CHIP = "rf-focus-ring rf-set-filter rf-hit-block";

const on = (pressed: boolean) => (pressed ? `${CHIP} rf-set-filter-on` : CHIP);

/** Adds or removes one value, for the two rows that take more than one. */
const toggled = <T,>(current: Set<T>, value: T): Set<T> => {
  const next = new Set(current);
  if (!next.delete(value)) next.add(value);
  return next;
};

export function SetFilters({
  sets,
  selected,
  onChange,
  status,
  onStatus,
  phases,
  onPhases,
  shown,
}: Props) {
  const categories = availableCategories(sets);

  if (categories.length === 0) return null;

  return (
    <div className="rf-set-filters">
      {/* Each question and the chips answering it are one box, so a wrap never
          leaves a label at the end of one line with its own chips at the start
          of the next — which is what "Status" did, three words away from four
          words that could have been kinds. */}
      <div className="rf-set-filters-group">
        <p className="rf-text-overline rf-fg-muted rf-set-filters-label">Kind</p>
        {categories.map((category) => (
          <button
            key={category}
            type="button"
            aria-pressed={selected.has(category)}
            className={on(selected.has(category))}
            onClick={() => onChange(toggled(selected, category))}
          >
            {SET_CATEGORY_LABEL[category]}
          </button>
        ))}

        {selected.size > 0 && (
          <button
            type="button"
            className={`${CHIP} rf-set-filter-clear`}
            onClick={() => onChange(new Set())}
          >
            Clear
          </button>
        )}
      </div>

      {/*
        Progress, beside the kinds: "which frames am I still missing" is one
        question, and asking it took two controls in two different places.
        Exclusive, because a set is either finished or it is not — a pair of
        toggles could be set to neither, which is a filter that shows nothing.
      */}
      <div className="rf-set-filters-group">
        <p className="rf-text-overline rf-fg-muted rf-set-filters-label">Progress</p>
        {ALL_SET_STATUSES.map((option, index) => (
          <button
            key={option}
            type="button"
            aria-pressed={status === option}
            /* "All" is too short a word to reach 44 across on its own, and
               grows leftwards only: the 4px gap to "Unfinished" is that
               chip's as much as this one's, while the inset that opens the
               group is nobody's. */
            className={
              index === 0 ? `${on(status === option)} rf-hit-inline-start` : on(status === option)
            }
            onClick={() => onStatus(option)}
          >
            {SET_STATUS_LABEL[option]}
          </button>
        ))}
      </div>

      {/* "Status", the word over the column these four chips filter, rather
          than "Phase", which is the field's own name and is one a reader who
          does not play cannot look up from here. */}
      <div className="rf-set-filters-group">
        <p className="rf-text-overline rf-fg-muted rf-set-filters-label">Status</p>
        {ALL_PRIME_PHASES.map((phase) => (
          <button
            key={phase}
            type="button"
            aria-pressed={phases.has(phase)}
            className={on(phases.has(phase))}
            onClick={() => onPhases(toggled(phases, phase))}
          >
            {PHASE_LABEL[phase]}
          </button>
        ))}
      </div>

      {/* The count is the only feedback that a chip did anything, and on a list
          this long the difference between 47 sets and 200 is not visible from
          the first screenful. */}
      <span className="rf-text-caption rf-fg-muted rf-set-filters-count" aria-live="polite">
        {shown} {shown === 1 ? "set" : "sets"}
      </span>
    </div>
  );
}
