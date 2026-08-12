import {
  ALL_SET_STATUSES,
  SET_CATEGORY_LABEL,
  SET_STATUS_LABEL,
  availableCategories,
  type SetStatus,
} from "../lib/setCategories";
import type { PrimeSet } from "../lib/setCompletion";
import type { SetCategory } from "../api/types";

interface Props {
  /** Every set the catalogue holds, before the filter — the chips come from it. */
  sets: PrimeSet[];
  selected: Set<SetCategory>;
  onChange: (next: Set<SetCategory>) => void;
  /** All sets, the unfinished, or the done. */
  status: SetStatus;
  onStatus: (next: SetStatus) => void;
  /** How many sets survive the current selection, for the count beside the chips. */
  shown: number;
}

/**
 * Which kinds of gear the Sets view is listing.
 *
 * Always open, unlike the filter bar on the catalogue views: this is one row of
 * words rather than four groups of controls, and a collapsed bar with one
 * question inside it costs more to open than it saves.
 *
 * The kinds are multi-select and nothing selected means everything: the reader
 * who wants frames and secondaries should not have to ask twice, and the view
 * has to open on the whole catalogue. Progress is exclusive beside them,
 * because a set cannot be both finished and not.
 */
export function SetFilters({ sets, selected, onChange, status, onStatus, shown }: Props) {
  const categories = availableCategories(sets);

  if (categories.length === 0) return null;

  const toggle = (category: SetCategory) => {
    const next = new Set(selected);
    if (!next.delete(category)) next.add(category);
    onChange(next);
  };

  return (
    <div className="rf-set-filters">
      <p className="rf-text-overline rf-fg-muted rf-set-filters-label">Kind</p>

      <div className="rf-set-filters-row">
        {categories.map((category) => (
          <button
            key={category}
            type="button"
            aria-pressed={selected.has(category)}
            className={
              selected.has(category)
                ? "rf-focus-ring rf-set-filter rf-set-filter-on"
                : "rf-focus-ring rf-set-filter"
            }
            onClick={() => toggle(category)}
          >
            {SET_CATEGORY_LABEL[category]}
          </button>
        ))}

        {selected.size > 0 && (
          <button
            type="button"
            className="rf-focus-ring rf-set-filter rf-set-filter-clear"
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
      <div className="rf-set-filters-row rf-set-filters-status">
        {ALL_SET_STATUSES.map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={status === option}
            className={
              status === option
                ? "rf-focus-ring rf-set-filter rf-set-filter-on"
                : "rf-focus-ring rf-set-filter"
            }
            onClick={() => onStatus(option)}
          >
            {SET_STATUS_LABEL[option]}
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
