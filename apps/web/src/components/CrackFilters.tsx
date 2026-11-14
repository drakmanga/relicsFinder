import type { ReactNode } from "react";

import {
  ALL_STEEL_PATH,
  SQUAD_SIZES,
  type CrackOptions,
  type SteelPathFilter,
} from "../lib/crackOptions";

interface Props {
  options: CrackOptions;
  onChange: (next: CrackOptions) => void;
  /** Every rated mission type, from the server's minutes table, fastest first. */
  missionTypes: string[];
}

const STEEL_PATH_LABEL: Record<SteelPathFilter, string> = {
  both: "Both",
  only: "Only",
  none: "None",
};

/* The Sets view's chip: a word that lights with a gold rule, grown to 44px
   tall by `rf-hit-block` without moving its ink (rule 7). */
const CHIP = "rf-focus-ring rf-set-filter rf-hit-block";
const chip = (pressed: boolean) => (pressed ? `${CHIP} rf-set-filter-on` : CHIP);

function Group({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="rf-set-filters-group" role="group" aria-label={label}>
      <p className="rf-text-overline rf-fg-muted rf-set-filters-label">{label}</p>
      {children}
    </div>
  );
}

/** The settings in one line, for the folded strip: "Solo · Steel Path both · 10 of 11 missions". */
function summary(options: CrackOptions, missionTypes: string[]): string {
  const played = missionTypes.filter((type) => !options.excluded.has(type)).length;
  return [
    options.players === 1 ? "Solo" : `Squad of ${options.players}`,
    `Steel Path ${STEEL_PATH_LABEL[options.steelPath].toLowerCase()}`,
    options.penaliseSteelPath && "counted as slower",
    options.voidStorms ? "Void Storms in" : "no Void Storms",
    `${played} of ${missionTypes.length} missions`,
  ]
    .filter(Boolean)
    .join(" · ");
}

/**
 * What the ranking assumes: the squad, which fissures count, and
 * whether Steel Path is slower for this player.
 *
 * Folded to one line by default: open, the five rows of chips pushed the
 * inventory and the ranking under the fold for settings read once a session.
 * Folded, though, the line still says every setting in force, because a
 * filter hidden behind a toggle is one the reader forgets is on.
 */
export function CrackFilters({ options, onChange, missionTypes }: Props) {
  const set = (patch: Partial<CrackOptions>) => onChange({ ...options, ...patch });

  const toggleMission = (type: string) => {
    const excluded = new Set(options.excluded);
    if (!excluded.delete(type)) excluded.add(type);
    set({ excluded });
  };

  return (
    <details className="rf-crack-filters">
      <summary className="rf-focus-ring rf-hit-block rf-crack-filters-summary">
        <span className="rf-text-overline rf-fg-secondary">Filters</span>
        <span className="rf-text-caption rf-fg-muted">{summary(options, missionTypes)}</span>
      </summary>
      <div className="rf-set-filters rf-crack-filters-strip">
        <Group label="Squad">
          {SQUAD_SIZES.map((players) => (
            <button
              key={players}
              type="button"
              aria-pressed={options.players === players}
              aria-label={players === 1 ? "Solo" : `Radshare of ${players}`}
              className={chip(options.players === players)}
              onClick={() => set({ players })}
            >
              {players}
            </button>
          ))}
        </Group>

        <Group label="Steel Path">
          {ALL_STEEL_PATH.map((steelPath) => (
            <button
              key={steelPath}
              type="button"
              aria-pressed={options.steelPath === steelPath}
              className={chip(options.steelPath === steelPath)}
              onClick={() => set({ steelPath })}
            >
              {STEEL_PATH_LABEL[steelPath]}
            </button>
          ))}
          {/* Beside the filter rather than in a settings page: it is a fact
            about this player that changes this ranking and no other. */}
          <button
            type="button"
            aria-pressed={options.penaliseSteelPath}
            className={chip(options.penaliseSteelPath)}
            onClick={() => set({ penaliseSteelPath: !options.penaliseSteelPath })}
          >
            Counts as slower
          </button>
        </Group>

        <Group label="Void Storms">
          <button
            type="button"
            aria-pressed={options.voidStorms}
            className={chip(options.voidStorms)}
            onClick={() => set({ voidStorms: !options.voidStorms })}
          >
            Include
          </button>
        </Group>

        {/* Pressed means "played": the list opens with every type lit, and
          switching one off is the exclusion. A list of exclusions drawn as
          lit chips would read backwards. */}
        <Group label="Missions">
          {missionTypes.map((type) => (
            <button
              key={type}
              type="button"
              aria-pressed={!options.excluded.has(type)}
              className={chip(!options.excluded.has(type))}
              onClick={() => toggleMission(type)}
            >
              {type}
            </button>
          ))}
        </Group>
      </div>
    </details>
  );
}
