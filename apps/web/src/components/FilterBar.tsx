import { RarityTag, TierChip } from "relic-finder-ui";

import {
  ALL_RARITIES,
  ALL_REFINEMENTS,
  ALL_TIERS,
  ALL_VAULT_FILTERS,
  REFINEMENT_LABEL,
  VAULT_LABEL,
  type Filters,
} from "../lib/rows";
import type { Rarity, Tier } from "../api/types";

interface Props {
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
export function FilterBar({ filters, onChange, view }: Props) {
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
              style={{
                fontSize: 11,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color:
                  filters.vault === vault && vault === "farmable"
                    ? "var(--rf-success)"
                    : "var(--rf-fg-secondary)",
              }}
            >
              {VAULT_LABEL[vault]}
            </span>
          </Toggle>
        ))}
      </Group>

      <Group label="Refinement">
        <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 210 }}>
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
            style={{ width: "100%", accentColor: "var(--rf-gold-500)" }}
          />
          {/* Labelled ticks rather than a single readout: the slider is also a
              legend for what the four positions are. */}
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            {ALL_REFINEMENTS.map((refinement) => (
              <span
                key={refinement}
                style={{
                  fontSize: 10,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  color:
                    refinement === filters.refinement
                      ? "var(--rf-fg-primary)"
                      : "var(--rf-fg-muted)",
                }}
              >
                {refinement === "exceptional" ? "Except." : REFINEMENT_LABEL[refinement]}
              </span>
            ))}
          </div>
        </div>
      </Group>

      <Group label="Max price" last>
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
            aria-label="Maximum price in platinum"
            style={{ width: 160, accentColor: "var(--rf-gold-500)" }}
          />
          <span
            className="rf-tabular"
            style={{ fontSize: 13, color: "var(--rf-fg-secondary)", minWidth: 76 }}
          >
            {filters.maxPrice === null ? "none" : `${filters.maxPrice} p`}
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
