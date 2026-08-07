import { RarityTag, TierChip } from "relic-finder-ui";

import {
  ALL_RARITIES,
  ALL_REFINEMENTS,
  ALL_TIERS,
  REFINEMENT_LABEL,
  type Filters,
} from "../lib/rows";
import type { Rarity, Refinement, Tier } from "../api/types";

interface Props {
  filters: Filters;
  onChange: (next: Filters) => void;
}

/**
 * Collapsible filter bar.
 *
 * Horizontal rather than a sidebar: the results table is dense and wide, and a
 * 260px column would come straight out of the item names.
 */
export function FilterBar({ filters, onChange }: Props) {
  const toggle = <T,>(set: Set<T>, value: T): Set<T> => {
    const next = new Set(set);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    return next;
  };

  return (
    <div
      style={{
        flex: "none",
        display: "flex",
        flexWrap: "wrap",
        background: "var(--rf-surface-2)",
        borderBottom: "1px solid var(--rf-border-default)",
      }}
    >
      <Group label="Tier">
        {ALL_TIERS.map((tier) => (
          <Toggle
            key={tier}
            on={filters.tiers.has(tier)}
            label={`Filtra per tier ${tier}`}
            onClick={() => onChange({ ...filters, tiers: toggle(filters.tiers, tier) })}
          >
            <TierChip tier={tier as Tier} />
          </Toggle>
        ))}
      </Group>

      <Group label="Rarità">
        {ALL_RARITIES.map((rarity) => (
          <Toggle
            key={rarity}
            on={filters.rarities.has(rarity)}
            label={`Filtra per rarità ${rarity}`}
            onClick={() => onChange({ ...filters, rarities: toggle(filters.rarities, rarity) })}
          >
            <RarityTag rarity={rarity as Rarity} />
          </Toggle>
        ))}
      </Group>

      <Group label="Raffinazione">
        {ALL_REFINEMENTS.map((refinement) => (
          <Toggle
            key={refinement}
            on={filters.refinements.has(refinement)}
            label={`Filtra per raffinazione ${refinement}`}
            onClick={() =>
              onChange({
                ...filters,
                refinements: toggle(filters.refinements, refinement as Refinement),
              })
            }
          >
            <span
              style={{
                fontSize: 11,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "var(--rf-fg-secondary)",
              }}
            >
              {REFINEMENT_LABEL[refinement]}
            </span>
          </Toggle>
        ))}
      </Group>

      <Group label="Prezzo massimo" last>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <input
            type="range"
            min={0}
            max={500}
            step={5}
            value={filters.maxPrice ?? 500}
            onChange={(event) => {
              const value = Number(event.target.value);
              onChange({ ...filters, maxPrice: value >= 500 ? null : value });
            }}
            aria-label="Prezzo massimo in platinum"
            style={{ width: 160, accentColor: "var(--rf-gold-500)" }}
          />
          <span
            className="rf-tabular"
            style={{ fontSize: 13, color: "var(--rf-fg-secondary)", minWidth: 76 }}
          >
            {filters.maxPrice === null ? "nessuno" : `${filters.maxPrice} p`}
          </span>
        </div>
      </Group>
    </div>
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
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "12px 18px",
        borderRight: last ? "none" : "1px solid var(--rf-border-subtle)",
      }}
    >
      <p className="rf-text-overline rf-fg-muted" style={{ marginBottom: 8 }}>
        {label}
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{children}</div>
    </div>
  );
}

/**
 * Filter toggle.
 *
 * The design system has no toggle component — in the Claude Design template
 * this was hand-written CSS too. It stays local until a second screen needs it,
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
      className="rf-focus-ring"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "5px 8px",
        cursor: "pointer",
        background: on ? "var(--rf-surface-3)" : "var(--rf-surface-2)",
        border: `1px solid ${on ? "var(--rf-border-interactive)" : "var(--rf-border-subtle)"}`,
        opacity: on ? 1 : 0.5,
        transition: "opacity var(--rf-dur-fast) var(--rf-ease-standard)",
      }}
    >
      {children}
    </button>
  );
}
