/**
 * Over 150 lines (rule 4). One bar, five groups, and two local primitives that
 * exist only here — a toggle and a slider tick. The design system has no toggle
 * component, and promoting one on a sample size of five would be guessing at
 * the second use.
 */
import { RarityTag, TierChip } from "relic-finder-ui";

import {
  ALL_RARITIES,
  ALL_REFINEMENTS,
  ALL_TIERS,
  ALL_VAULT_FILTERS,
  MAX_PRICE_CEILING,
  REFINEMENT_LABEL,
  VAULT_LABEL,
  type Filters,
} from "../lib/rows";
import type { Rarity, Tier } from "../api/types";

interface Props {
  /** Target of the toggle's `aria-controls`, so the two are tied together. */
  id?: string;
  filters: Filters;
  onChange: (next: Filters) => void;
  /** Which catalogue view the bar is filtering. */
  view: "relics" | "items";
}

/**
 * Collapsible filter bar.
 *
 * Horizontal rather than a sidebar: the results table is dense and wide, and a
 * 260px column would come straight out of the item names.
 */
export function FilterBar({ id, filters, onChange, view }: Props) {
  const toggle = <T,>(set: Set<T>, value: T): Set<T> => {
    const next = new Set(set);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    return next;
  };

  return (
    <div id={id} className="rf-filters">
      <Group label="Tier">
        {ALL_TIERS.map((tier) => (
          <Toggle
            key={tier}
            on={filters.tiers.has(tier)}
            label={`Filter by tier ${tier}`}
            onClick={() => onChange({ ...filters, tiers: toggle(filters.tiers, tier) })}
          >
            <TierChip tier={tier as Tier} />
          </Toggle>
        ))}
      </Group>

      {/*
        Rarity is a property of a drop, not of a relic. Every relic in the game
        holds three commons, two uncommons and one rare, so on a list of relics
        the filter can only ever keep all of them or, with all three off, keep
        all of them again — a control that cannot change its own result. It
        earns its place on Prime Items, where a row is a part and the rarity is
        that part's own.
      */}
      {view === "items" && (
        <Group label="Rarity">
          {ALL_RARITIES.map((rarity) => (
            <Toggle
              key={rarity}
              on={filters.rarities.has(rarity)}
              label={`Filter by rarity ${rarity}`}
              onClick={() => onChange({ ...filters, rarities: toggle(filters.rarities, rarity) })}
            >
              <RarityTag rarity={rarity as Rarity} />
            </Toggle>
          ))}
        </Group>
      )}

      {/*
        Three exclusive states rather than toggles, because "neither farmable
        nor vaulted" is not a thing a relic can be — and a filter that can be
        set to an empty result is a trap.
      */}
      <Group label="Vault">
        {ALL_VAULT_FILTERS.map((vault) => (
          <Toggle
            key={vault}
            on={filters.vault === vault}
            label={`Show ${VAULT_LABEL[vault].toLowerCase()} relics`}
            onClick={() => onChange({ ...filters, vault })}
          >
            <span
              className={
                filters.vault === vault && vault === "farmable"
                  ? "rf-filter-vault rf-filter-vault-on"
                  : "rf-filter-vault"
              }
            >
              {VAULT_LABEL[vault]}
            </span>
          </Toggle>
        ))}
      </Group>

      <Group label="Refinement">
        <div className="rf-slider">
          <input
            type="range"
            min={0}
            max={ALL_REFINEMENTS.length - 1}
            step={1}
            value={ALL_REFINEMENTS.indexOf(filters.refinement)}
            onChange={(event) =>
              onChange({
                ...filters,
                refinement: ALL_REFINEMENTS[Number(event.target.value)] ?? "intact",
              })
            }
            aria-label="Refinement level"
            aria-valuetext={REFINEMENT_LABEL[filters.refinement]}
            className="rf-range"
          />
          {/* Labelled ticks rather than a single readout: the slider is also a
              legend for what the four positions are. */}
          <div className="rf-slider-scale">
            {ALL_REFINEMENTS.map((refinement) => (
              <End key={refinement} on={refinement === filters.refinement}>
                {refinement === "exceptional" ? "Except." : REFINEMENT_LABEL[refinement]}
              </End>
            ))}
          </div>
        </div>
      </Group>

      {/*
        Built like Refinement above — slider, then a row of labels under it —
        so the two tracks sit on the same line. With the readout beside the
        slider instead, this group was one row tall against the other's two,
        and centring each group in the bar left the two sliders at different
        heights.
      */}
      <Group label="Max price" last>
        <div className="rf-slider">
          <input
            type="range"
            min={0}
            max={MAX_PRICE_CEILING}
            step={5}
            value={filters.maxPrice ?? MAX_PRICE_CEILING}
            onChange={(event) => {
              const value = Number(event.target.value);
              onChange({ ...filters, maxPrice: value >= MAX_PRICE_CEILING ? null : value });
            }}
            aria-label="Maximum price in platinum"
            aria-valuetext={
              filters.maxPrice === null
                ? "All prices"
                : filters.maxPrice === 0
                  ? "No price"
                  : `${filters.maxPrice} platinum`
            }
            className="rf-range"
          />
          {/*
            The ends are named. "None" used to sit at the far right, where the
            slider stops filtering — the one position that keeps everything was
            labelled as if it kept nothing. Left is the tightest ceiling and
            right is no ceiling at all, so they read None and All.
          */}
          <div className="rf-slider-scale">
            <End on={filters.maxPrice === 0}>None</End>
            <span
              className="rf-tabular rf-slider-value"
              hidden={filters.maxPrice === null || filters.maxPrice === 0}
            >
              {filters.maxPrice ?? 0} p
            </span>
            <End on={filters.maxPrice === null}>All</End>
          </div>
        </div>
      </Group>
    </div>
  );
}

/** One end of a slider's scale, lit when the slider is sitting on it. */
function End({ on, children }: { on: boolean; children: React.ReactNode }) {
  return (
    <span className={on ? "rf-slider-tick rf-slider-tick-on" : "rf-slider-tick"}>{children}</span>
  );
}

function Group({
  label,
  children,
  last = false,
}: {
  label: string;
  children: React.ReactNode;
  last?: boolean;
}) {
  return (
    <div className={last ? "rf-filter-group rf-filter-group-last" : "rf-filter-group"}>
      <p className="rf-text-overline rf-fg-muted rf-filter-group-label">{label}</p>
      <div className="rf-filter-group-body">{children}</div>
    </div>
  );
}

/**
 * Filter toggle.
 *
 * The design system has no toggle component — in the design template this was
 * hand-written CSS too. It stays local until a second screen needs it,
 * rather than being promoted to the library on a sample size of one.
 */
function Toggle({
  on,
  label,
  onClick,
  children,
}: {
  on: boolean;
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      aria-label={label}
      className="rf-focus-ring rf-filter-toggle"
    >
      {children}
    </button>
  );
}
