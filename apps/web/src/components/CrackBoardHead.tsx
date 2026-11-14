import type { CrackOptions } from "../lib/crackOptions";

interface Props {
  options: CrackOptions;
  onChange: (patch: Partial<CrackOptions>) => void;
}

const GROUPINGS = [
  { byFissure: false, label: "By relic" },
  { byFissure: true, label: "By fissure" },
] as const;

/* The Sets view's chip, as in the filters above. */
const CHIP = "rf-focus-ring rf-set-filter rf-hit-block";
const chip = (pressed: boolean) => (pressed ? `${CHIP} rf-set-filter-on` : CHIP);

/**
 * The ranking's title and the two switches that change how it is drawn, not
 * what it says: grouped or not, and the waits shown or not.
 */
export function CrackBoardHead({ options, onChange }: Props) {
  return (
    <div className="rf-crack-board-head">
      <h3 id="rf-crack-board-title" className="rf-text-heading-md rf-crack-section-title">
        What to open now
      </h3>

      <div className="rf-crack-board-switches">
        {/* A switch rather than a second list: the same rows, read as "which
            relic" or as "where do I go and what do I open there". */}
        <div className="rf-set-filters-group" role="group" aria-label="Show">
          {GROUPINGS.map(({ byFissure, label }) => (
            <button
              key={label}
              type="button"
              aria-pressed={options.byFissure === byFissure}
              className={chip(options.byFissure === byFissure)}
              onClick={() => onChange({ byFissure })}
            >
              {label}
            </button>
          ))}
        </div>

        {/* With a few hundred relics held most rows are waits; hiding them
            leaves the list that is acted on tonight. */}
        <div className="rf-set-filters-group">
          <button
            type="button"
            aria-pressed={options.onlyOpen}
            className={chip(options.onlyOpen)}
            onClick={() => onChange({ onlyOpen: !options.onlyOpen })}
          >
            Only open
          </button>
        </div>
      </div>
    </div>
  );
}
