import { RarityTag, TierChip, XIcon } from "relic-finder-ui";

import { applyToken, suggestions, type FilterToken } from "../lib/filterMemory";
import { REFINEMENT_LABEL, VAULT_LABEL, type Filters } from "../lib/rows";
import type { CatalogueView } from "../lib/useViewState";

interface Props {
  filters: Filters;
  /** Rarity only means something on the list of parts. See FilterBar. */
  view: CatalogueView;
  onChange: (next: Filters) => void;
}

/**
 * What the shut filter bar is doing, and what it usually does.
 *
 * Two rows of chips in one strip. The first is what is on right now, and each
 * chip switches itself off: with the bar closed the only way to drop a filter
 * was to reopen the bar, find the control and press it again, which is a lot of
 * machinery for undoing something the strip was already naming. The second is
 * what this browser filters by most often (see lib/filterMemory) — the bar is
 * closed by default, so the filters someone reaches for every evening were
 * three clicks away every time.
 */
export function FilterSummary({ filters, view, onChange }: Props) {
  const active = activeTokens(filters, view);
  const suggested = suggestions(view, filters);
  const hasPrice = filters.maxPrice !== null;

  if (active.length === 0 && !hasPrice && suggested.length === 0) return null;

  return (
    <span className="rf-filter-summary">
      {active.map((token) => (
        <button
          key={id(token)}
          type="button"
          className="rf-focus-ring rf-filter-summary-chip"
          aria-label={`Remove the ${label(token)} filter`}
          title={`Remove the ${label(token)} filter`}
          onClick={() => onChange(clearToken(filters, token))}
        >
          <Chip token={token} />
          <XIcon width={11} height={11} />
        </button>
      ))}

      {hasPrice && (
        <button
          type="button"
          className="rf-focus-ring rf-filter-summary-chip"
          aria-label="Remove the price ceiling"
          title="Remove the price ceiling"
          onClick={() => onChange({ ...filters, maxPrice: null })}
        >
          <span className="rf-text-caption rf-filter-summary-word">≤ {filters.maxPrice} p</span>
          <XIcon width={11} height={11} />
        </button>
      )}

      {suggested.length > 0 && (
        <>
          {/* Named, because an unlabelled chip that adds a filter looks exactly
              like one that is already on. */}
          <span className="rf-text-caption rf-fg-muted rf-filter-summary-lead">Often</span>
          {suggested.map((token) => (
            <button
              key={id(token)}
              type="button"
              className="rf-focus-ring rf-filter-summary-chip rf-filter-summary-suggested"
              aria-label={`Filter by ${label(token)}`}
              title={`Filter by ${label(token)}`}
              onClick={() => onChange(applyToken(filters, token))}
            >
              <Chip token={token} />
            </button>
          ))}
        </>
      )}
    </span>
  );
}

/** The chip the filter bar itself would draw for this filter. */
function Chip({ token }: { token: FilterToken }) {
  if (token.kind === "tier") return <TierChip tier={token.value} />;
  if (token.kind === "rarity") return <RarityTag rarity={token.value} />;
  return <span className="rf-text-caption rf-filter-summary-word">{label(token)}</span>;
}

const id = (token: FilterToken) => `${token.kind}:${token.value}`;

const label = (token: FilterToken) =>
  token.kind === "vault"
    ? VAULT_LABEL[token.value]
    : token.kind === "refinement"
      ? REFINEMENT_LABEL[token.value]
      : token.value;

/** Everything switched on, in the order the bar lays its groups out. */
function activeTokens(filters: Filters, view: CatalogueView): FilterToken[] {
  return [
    ...[...filters.tiers].map((value): FilterToken => ({ kind: "tier", value })),
    ...(view === "items"
      ? [...filters.rarities].map((value): FilterToken => ({ kind: "rarity", value }))
      : []),
    ...(filters.vault !== "all" ? [{ kind: "vault", value: filters.vault } as FilterToken] : []),
    ...(filters.refinement !== "intact"
      ? [{ kind: "refinement", value: filters.refinement } as FilterToken]
      : []),
  ];
}

/** Switches one filter off. The exclusive ones go back to their "no filter" end. */
function clearToken(filters: Filters, token: FilterToken): Filters {
  switch (token.kind) {
    case "tier": {
      const tiers = new Set(filters.tiers);
      tiers.delete(token.value);
      return { ...filters, tiers };
    }
    case "rarity": {
      const rarities = new Set(filters.rarities);
      rarities.delete(token.value);
      return { ...filters, rarities };
    }
    case "vault":
      return { ...filters, vault: "all" };
    case "refinement":
      return { ...filters, refinement: "intact" };
  }
}
